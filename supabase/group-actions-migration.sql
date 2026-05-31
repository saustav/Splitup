-- Rename (owners) and leave group (remove own membership)

drop policy if exists "Users can leave groups" on public.group_members;
create policy "Users can leave groups"
  on public.group_members for delete
  using (user_id = auth.uid());
