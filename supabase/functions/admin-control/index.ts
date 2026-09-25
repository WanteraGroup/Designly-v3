import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
function corsHeadersFor(req:Request):Record<string,string>{
  const origin=req.headers.get("origin")??"";
  const allowed=["https://designly-v3.vercel.app","https://designly-v3-designlystudio36-1723.vercel.app","http://localhost:5173","http://localhost:4173",...(Deno.env.get("DESIGNLY_ALLOWED_ORIGINS")??"").split(",").map(s=>s.trim()).filter(Boolean)];
  const h:Record<string,string>={"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
  if(origin&&allowed.includes(origin))h["Access-Control-Allow-Origin"]=origin;
  return h;
}

const json=(req:Request,body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...corsHeadersFor(req),"Content-Type":"application/json"},
});

function serviceKey(){
  return Deno.env.get("SUPABASE_SECRET_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? (()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}").default}catch{return undefined}})();
}

Deno.serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeadersFor(req)});
  if(req.method!=="POST") return json(req,{error:"Method not allowed"},405);

  const authHeader=req.headers.get("Authorization")??"";
  const token=authHeader.replace(/^Bearer\s+/i,"");
  const key=serviceKey();
  if(!token||!key) return json(req,{error:"Unauthorized"},401);

  const admin=createClient(Deno.env.get("SUPABASE_URL")!,key);
  const {data:{user}}=await admin.auth.getUser(token);
  if(!user) return json(req,{error:"Unauthorized"},401);

  const {data:actor}=await admin.from("profiles").select("id,email,role").eq("id",user.id).single();
  if(!actor||!["owner","admin"].includes(actor.role)) return json(req,{error:"Forbidden"},403);

  try{
    const body=await req.json();
    const action=String(body?.action??"");

    if(action==="overview"){
      const [profiles,plans,gifts,audit,jobs,payments,settings]=await Promise.all([
        admin.from("profiles").select("id,email,full_name,role,plan_id,credits,unlimited_access,created_at,updated_at").order("created_at",{ascending:false}).limit(100),
        admin.from("plans").select("id,name,price_monthly,credits_monthly,project_limit,features,is_public,sort_order").order("sort_order"),
        admin.from("admin_gifts").select("id,email,target_user_id,gift_type,plan_id,previous_plan_id,previous_credits,status,granted_by,created_at,activated_at,revoked_at").order("created_at",{ascending:false}).limit(50),
        admin.from("admin_audit_log").select("id,actor_user_id,action,target_email,target_user_id,metadata,created_at").order("created_at",{ascending:false}).limit(50),
        admin.from("ai_generation_jobs").select("id,user_id,type,status,provider,credits_cost,created_at,completed_at,error").order("created_at",{ascending:false}).limit(50),
        admin.from("payments").select("id,user_id,amount,currency,type,status,provider,provider_payment_id,created_at").order("created_at",{ascending:false}).limit(50),
        admin.from("system_settings").select("key,value,description,updated_at").order("key"),
      ]);
      for(const result of [profiles,plans,gifts,audit,jobs,payments,settings]) if(result.error) throw result.error;
      return json(req,{profiles:profiles.data??[],plans:plans.data??[],gifts:gifts.data??[],audit:audit.data??[],jobs:jobs.data??[],payments:payments.data??[],settings:settings.data??[]});
    }

    if(action==="subscriptions"){
      const result=await admin.from("subscriptions").select("id,user_id,plan_id,status,provider,provider_subscription_id,stripe_customer_id,stripe_price_id,current_period_end,created_at,updated_at").order("created_at",{ascending:false}).limit(200);
      if(result.error) throw result.error;
      return json(req,{subscriptions:result.data??[]});
    }

    if(action==="user_search"){
      const q=String(body?.query??"").trim();
      let query=admin.from("profiles").select("id,email,full_name,role,plan_id,credits,unlimited_access,created_at,updated_at").order("created_at",{ascending:false}).limit(50);
      if(q) query=query.or("email.ilike.%"+q+"%,full_name.ilike.%"+q+"%");
      const result=await query;
      if(result.error) throw result.error;
      return json(req,{users:result.data??[]});
    }

    const targetEmail=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
    let target:any=null;
    if(targetEmail){
      const r=await admin.from("profiles").select("id,email,full_name,role,plan_id,credits,unlimited_access").ilike("email",targetEmail).maybeSingle();
      if(r.error) throw r.error;
      target=r.data;
    } else if(typeof body?.userId==="string"){
      const r=await admin.from("profiles").select("id,email,full_name,role,plan_id,credits,unlimited_access").eq("id",body.userId).maybeSingle();
      if(r.error) throw r.error;
      target=r.data;
    }

    if(["gift","set_plan","set_credits","set_unlimited","set_role"].includes(action) && !target){
      return json(req,{error:"User not found"},404);
    }

    const audit=async(actionName:string,metadata:Record<string,unknown>)=>{
      await admin.from("admin_audit_log").insert({
        actor_user_id:actor.id,
        action:actionName,
        target_email:(target?.email ?? targetEmail) || null,
        target_user_id:target?.id??null,
        metadata,
      });
    };

    if(action==="gift"){
      const giftType=body?.giftType==="plan"?"plan":"full_unlock";
      const planId=giftType==="plan"?String(body?.planId??"pro"):"owner";
      const previousPlan=target.plan_id;
      const previousCredits=target.credits;
      const update=giftType==="full_unlock"
        ? {plan_id:"owner",unlimited_access:true}
        : {plan_id:planId,unlimited_access:false};

      const updated=await admin.from("profiles").update(update).eq("id",target.id);
      if(updated.error) throw updated.error;

      const inserted=await admin.from("admin_gifts").insert({
        email:target.email,target_user_id:target.id,gift_type:giftType,plan_id:giftType==="plan"?planId:null,
        previous_plan_id:previousPlan,previous_credits:previousCredits,status:"active",granted_by:actor.id,activated_at:new Date().toISOString()
      }).select("id").single();
      if(inserted.error) throw inserted.error;

      await audit("gift_access",{gift_id:inserted.data.id,gift_type:giftType,plan_id:giftType==="plan"?planId:null});
      return json(req,{message:"Hozzáférés sikeresen kiosztva.",userId:target.id});
    }

    if(action==="set_plan"){
      const planId=String(body?.planId??"");
      const valid=["free","starter","pro","business","agency","ultimate","owner"];
      if(!valid.includes(planId)) return json(req,{error:"Invalid plan"},400);
      const result=await admin.from("profiles").update({plan_id:planId,unlimited_access:planId==="owner"?true:target.unlimited_access}).eq("id",target.id);
      if(result.error) throw result.error;
      await audit("set_plan",{from:target.plan_id,to:planId});
      return json(req,{message:"Csomag frissítve."});
    }

    if(action==="set_credits"){
      const amount=Math.floor(Number(body?.credits));
      if(!Number.isFinite(amount)||amount<0||amount>10000000) return json(req,{error:"Invalid credits"},400);
      const delta=amount-target.credits;
      if(delta>0){
        const result=await admin.rpc("add_credits",{p_user_id:target.id,p_amount:delta,p_type:"admin_adjustment",p_description:"Admin kreditbeállítás"});
        if(result.error) throw result.error;
      } else if(delta<0){
        const result=await admin.rpc("deduct_credits",{p_user_id:target.id,p_amount:-delta,p_description:"Admin kreditbeállítás"});
        if(result.error) throw result.error;
      }
      if(delta===0){}
      await audit("set_credits",{from:target.credits,to:amount,delta});
      return json(req,{message:"Kreditkeret frissítve."});
    }

    if(action==="set_unlimited"){
      const enabled=Boolean(body?.enabled);
      const result=await admin.from("profiles").update({unlimited_access:enabled}).eq("id",target.id);
      if(result.error) throw result.error;
      await audit("set_unlimited",{enabled});
      return json(req,{message:enabled?"Teljes feloldás bekapcsolva.":"Teljes feloldás kikapcsolva."});
    }

    if(action==="set_role"){
      if(actor.role!=="owner") return json(req,{error:"Only owner can change roles"},403);
      const role=["user","admin","owner"].includes(body?.role)?body.role:"user";
      const result=await admin.from("profiles").update({role}).eq("id",target.id);
      if(result.error) throw result.error;
      await audit("set_role",{role});
      return json(req,{message:"Szerepkör frissítve."});
    }

    if(action==="save_plan"){
      if(actor.role!=="owner") return json(req,{error:"Only owner can edit plans"},403);
      const id=String(body?.id??"");
      const price=Math.max(0,Math.floor(Number(body?.price_monthly??0)));
      const credits=Math.max(0,Math.floor(Number(body?.credits_monthly??0)));
      const projectLimit=Math.max(0,Math.floor(Number(body?.project_limit??0)));
      const isPublic=Boolean(body?.is_public);
      if(!id) return json(req,{error:"Plan id required"},400);
      const result=await admin.from("plans").update({price_monthly:price,credits_monthly:credits,project_limit:projectLimit,is_public:isPublic}).eq("id",id);
      if(result.error) throw result.error;
      await audit("update_plan",{plan_id:id,price_monthly:price,credits_monthly:credits,project_limit:projectLimit,is_public:isPublic});
      return json(req,{message:"Csomag frissítve."});
    }

    if(action==="save_setting"){
      if(actor.role!=="owner") return json(req,{error:"Only owner can edit settings"},403);
      const key=String(body?.key??"");
      if(!key||key.length>120) return json(req,{error:"Invalid setting key"},400);
      const result=await admin.from("system_settings").upsert({key,value:body?.value??{},description:String(body?.description??"").slice(0,500),updated_at:new Date().toISOString()});
      if(result.error) throw result.error;
      await audit("update_setting",{key});
      return json(req,{message:"Beállítás frissítve."});
    }

    return json(req,{error:"Unknown action"},400);
  }catch(error){
    console.error("admin-control error",error);
    return json(req,{error:error instanceof Error?error.message:"Admin művelet sikertelen."},500);
  }
});
