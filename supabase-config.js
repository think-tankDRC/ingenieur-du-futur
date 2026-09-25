/*
  Configuration publique Supabase.
  Remplacez uniquement les deux valeurs ci-dessous par celles de votre projet :
  Project Settings > API > Project URL et Publishable key (ou anon key).
  Ne placez jamais une clé secret/service_role dans ce fichier.
*/
(function () {
  const SUPABASE_URL = 'https://rblpttbzorbhmsovrhsd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LcZY0BwqoFHhSelkFr7Ruw_fDl5npYB';

  window.supabaseConfigured =
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_') &&
    !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

  window.supabaseDb = window.supabaseConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;
})();


