-- Migration complémentaire du portail MA 3E.
create or replace function public.ma3e_teacher() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2',false) and exists(select 1 from ma3e_private.teachers where user_id=auth.uid())
$$;
create function public.ma3e_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from ma3e_private.teachers where user_id=auth.uid())
$$;
revoke all on function public.ma3e_member() from public,anon;
grant execute on function public.ma3e_member() to authenticated;
alter table ma3e_private.documents add column state text not null default 'published' check(state in ('draft','published','archived')), add column publication timestamptz not null default now(), add column description text not null default '';
update ma3e_private.documents set publication=created_at;
create or replace function public.ma3e_list(k text) returns table(id uuid,title text,category text,"publishedAt" timestamptz) language plpgsql stable security definer set search_path='' as $$ begin
if not ma3e_private.allowed(k) then raise insufficient_privilege; end if;
return query select d.id,d.title,d.category,d.publication from ma3e_private.documents d where d.state='published' and d.publication<=now() order by d.publication desc; end $$;
create or replace function public.ma3e_read(k text,doc uuid) returns text language plpgsql stable security definer set search_path='' as $$ begin
if not ma3e_private.allowed(k) then raise insufficient_privilege; end if;
return (select encode(body,'base64') from ma3e_private.documents where id=doc and (public.ma3e_teacher() or (state='published' and publication<=now())));end $$;
create function public.ma3e_inventory() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
if not public.ma3e_teacher() then raise insufficient_privilege; end if;
return coalesce((select jsonb_agg(to_jsonb(x) order by x.publication desc) from (select id,title,category,state,publication,description from ma3e_private.documents) x),'[]');end $$;
create function public.ma3e_edit(doc uuid,t text,c text,s text,p timestamptz,descr text,pdf text) returns uuid language plpgsql security definer set search_path='' as $$
declare bytes bytea; result uuid;
begin
if not public.ma3e_teacher() then raise insufficient_privilege;end if;
if s='delete' then delete from ma3e_private.documents where id=doc;return doc;end if;
if length(trim(t)) not between 1 and 100 or c not in ('classe','orientation','dnb','certifications') or length(descr)>2000 or p is null or length(pdf)>6990508 then raise exception 'Saisie invalide';end if;
if pdf is not null then bytes:=decode(pdf,'base64');if substring(bytes from 1 for 5)<>convert_to('%PDF-','UTF8') or octet_length(bytes)>5242880 then raise exception 'PDF invalide';end if;end if;
if doc is null then insert into ma3e_private.documents(title,category,state,publication,description,body) values(trim(t),c,s,p,descr,bytes) returning id into result;
else update ma3e_private.documents set title=trim(t),category=c,state=s,publication=p,description=descr,body=coalesce(bytes,body) where id=doc returning id into result;end if;
if result is null then raise exception 'Document absent';end if;return result;end $$;
revoke all on function public.ma3e_inventory(),public.ma3e_edit(uuid,text,text,text,timestamptz,text,text) from public,anon;
grant execute on function public.ma3e_inventory(),public.ma3e_edit(uuid,text,text,text,timestamptz,text,text) to authenticated;
