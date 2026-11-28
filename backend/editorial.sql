create table ma3e_private.editorial(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('event','notice')), title text not null check(length(title) between 1 and 140),detail text not null default '' check(length(detail)<=1200),starts date not null,ends date not null check(ends>=starts),priority boolean not null default false,category text not null check(category in ('classe','orientation','dnb','certifications')),document uuid references ma3e_private.documents(id) on delete set null);
create function public.ma3e_editorial() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(e) order by e.starts,e.title),'[]') from ma3e_private.editorial e where (e.kind='event' or current_date between e.starts and e.ends) or public.ma3e_teacher()
$$;
grant execute on function public.ma3e_editorial() to anon,authenticated;
create function public.ma3e_save_item(item uuid,remove_item boolean,kind text,title text,detail text,starts date,ends date,priority boolean,category text,document uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ident uuid:=coalesce(item,gen_random_uuid());
begin
if not public.ma3e_teacher() then raise insufficient_privilege;end if;
if remove_item then delete from ma3e_private.editorial where id=item;return item;end if;
insert into ma3e_private.editorial values(ident,kind,trim(title),detail,starts,ends,priority,category,document)
on conflict(id) do update set kind=excluded.kind,title=excluded.title,detail=excluded.detail,starts=excluded.starts,ends=excluded.ends,priority=excluded.priority,category=excluded.category,document=excluded.document;
return ident;end $$;
revoke all on function public.ma3e_save_item(uuid,boolean,text,text,text,date,date,boolean,text,uuid) from public,anon;
grant execute on function public.ma3e_save_item(uuid,boolean,text,text,text,date,date,boolean,text,uuid) to authenticated;
