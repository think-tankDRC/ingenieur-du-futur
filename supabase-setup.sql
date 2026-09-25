-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Cette table reçoit les inscriptions et autorise leur gestion publique.
-- Toute personne possédant l'URL du dashboard peut donc gérer les données.

create table if not exists public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  postnom text not null,
  prenom text not null,
  sexe text not null check (sexe in ('Femme', 'Homme', 'Autre', 'Non précisé')),
  telephone text not null,
  email text not null,
  entreprise text,
  fonction text,
  universite text not null,
  faculte text not null,
  niveau_etude text not null,
  statut text not null default 'Nouveau' check (statut in ('Nouveau', 'Contacté', 'Validé', 'Refusé')),
  date_inscription timestamptz not null default now()
);

alter table public.inscriptions enable row level security;

drop policy if exists "inscription publique" on public.inscriptions;
create policy "inscription publique"
on public.inscriptions
for insert
to anon, authenticated
with check (
  statut = 'Nouveau'
  and char_length(trim(nom)) between 1 and 120
  and char_length(trim(postnom)) between 1 and 120
  and char_length(trim(prenom)) between 1 and 120
  and char_length(trim(telephone)) between 8 and 30
  and char_length(trim(email)) between 5 and 254
  and char_length(trim(universite)) between 1 and 200
  and char_length(trim(faculte)) between 1 and 200
);

drop policy if exists "administrateurs lecture" on public.inscriptions;
drop policy if exists "administrateurs modification" on public.inscriptions;
drop policy if exists "administrateurs suppression" on public.inscriptions;

drop policy if exists "lecture publique" on public.inscriptions;
create policy "lecture publique"
on public.inscriptions for select to anon, authenticated
using (true);

drop policy if exists "modification publique" on public.inscriptions;
create policy "modification publique"
on public.inscriptions for update to anon, authenticated
using (true) with check (true);

drop policy if exists "suppression publique" on public.inscriptions;
create policy "suppression publique"
on public.inscriptions for delete to anon, authenticated
using (true);

revoke all on table public.inscriptions from anon;
grant select, insert, update, delete on table public.inscriptions to anon;
grant select, insert, update, delete on table public.inscriptions to authenticated;

create index if not exists inscriptions_date_idx
on public.inscriptions (date_inscription desc);

create index if not exists inscriptions_statut_idx
on public.inscriptions (statut);
