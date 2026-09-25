const $ = selector => document.querySelector(selector);
const tableBody = $('#tableBody');
let inscriptions = [];

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function mapRow(row) {
  return {
    ...row,
    niveauEtude: row.niveau_etude,
    dateInscription: row.date_inscription
  };
}

function initials(item) {
  return `${item.prenom?.[0] || ''}${item.nom?.[0] || ''}`.toUpperCase() || 'IF';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date(date));
}

function statusClass(status) {
  return normalize(status || 'Nouveau');
}

function filteredData() {
  const query = normalize($('#searchInput').value);
  const status = $('#statusFilter').value;
  const level = $('#levelFilter').value;

  return inscriptions.filter(item => {
    const haystack = normalize([
      item.nom, item.postnom, item.prenom, item.email,
      item.telephone, item.universite, item.faculte
    ].join(' '));
    return (!query || haystack.includes(query)) &&
      (!status || item.statut === status) &&
      (!level || item.niveauEtude === level);
  });
}

function render() {
  const data = filteredData();
  tableBody.innerHTML = data.map(item => `<tr>
    <td><div class="person"><div class="avatar">${esc(initials(item))}</div><div><strong>${esc([item.prenom, item.nom, item.postnom].filter(Boolean).join(' '))}</strong><span>${esc(item.sexe || 'Non précisé')}</span></div></div></td>
    <td>${esc(item.telephone || '—')}<span class="cell-sub">${esc(item.email || '—')}</span></td>
    <td>${esc(item.universite || '—')}<span class="cell-sub">${esc(item.entreprise || '')}</span></td>
    <td>${esc(item.faculte || '—')}<span class="cell-sub">${esc(item.fonction || '')}</span></td>
    <td>${esc(item.niveauEtude || '—')}</td>
    <td>${formatDate(item.dateInscription || Date.now())}</td>
    <td><button class="status ${statusClass(item.statut)}" data-action="status" data-id="${esc(item.id)}">${esc(item.statut || 'Nouveau')}</button></td>
    <td><div class="row-actions"><button class="confirm-btn ${item.statut === 'Validé' ? 'sent' : ''}" data-action="confirm" data-id="${esc(item.id)}" title="Confirmer et ouvrir WhatsApp">${item.statut === 'Validé' ? 'WhatsApp' : 'Confirmer'}</button><button class="icon-btn" data-action="view" data-id="${esc(item.id)}" title="Voir">◉</button><button class="icon-btn danger" data-action="delete" data-id="${esc(item.id)}" title="Supprimer">⌫</button></div></td>
  </tr>`).join('');

  $('#emptyState').hidden = data.length !== 0;
  $('table').style.display = data.length ? 'table' : 'none';
  $('#resultLabel').textContent = data.length === inscriptions.length
    ? 'Toutes les candidatures reçues'
    : `${data.length} candidature(s) filtrée(s)`;
  $('#tableSummary').textContent = `${data.length} résultat${data.length > 1 ? 's' : ''}`;
  updateStats();
}

function updateStats() {
  const total = inscriptions.length;
  const men = inscriptions.filter(item => normalize(item.sexe) === 'homme').length;
  const women = inscriptions.filter(item => normalize(item.sexe) === 'femme').length;
  $('#totalCount').textContent = total;
  $('#menCount').textContent = men;
  $('#womenCount').textContent = women;
  $('#menRate').textContent = `${total ? Math.round(men / total * 100) : 0}% du total`;
  $('#womenRate').textContent = `${total ? Math.round(women / total * 100) : 0}% du total`;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function loadInscriptions() {
  $('#resultLabel').textContent = 'Chargement des candidatures…';
  const { data, error } = await window.supabaseDb
    .from('inscriptions')
    .select('*')
    .order('date_inscription', { ascending: false });

  if (error) {
    console.error(error);
    showToast('Impossible de charger les inscriptions');
    return;
  }
  inscriptions = (data || []).map(mapRow);
  render();
}

async function cycleStatus(item) {
  const states = ['Nouveau', 'Contacté', 'Validé', 'Refusé'];
  const nextStatus = states[(states.indexOf(item.statut) + 1) % states.length] || states[0];
  const { error } = await window.supabaseDb
    .from('inscriptions')
    .update({ statut: nextStatus })
    .eq('id', item.id);

  if (error) {
    console.error(error);
    showToast('Le statut n’a pas pu être modifié');
    return;
  }
  item.statut = nextStatus;
  render();
  showToast(`Statut changé : ${nextStatus}`);
}

function normalizeWhatsAppNumber(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `243${digits.slice(1)}`;
  else if (digits.length === 9) digits = `243${digits}`;
  return digits;
}

function buildWhatsAppUrl(item) {
  const phone = normalizeWhatsAppNumber(item.telephone);
  if (!/^\d{10,15}$/.test(phone)) return null;
  const name = [item.prenom, item.nom, item.postnom].filter(Boolean).join(' ');
  const message = [
    `Bonjour ${name},`,
    '',
    'Votre inscription à la Masterclass des Ingénieurs du Futur est confirmée.',
    '',
    'Date : mercredi 14 octobre 2026',
    'Heure : 10 h 00',
    'Lieu : Hilton',
    '',
    'Au plaisir de vous accueillir.'
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function confirmViaWhatsApp(item) {
  const whatsappUrl = buildWhatsAppUrl(item);
  if (!whatsappUrl) {
    showToast('Le numéro WhatsApp du candidat est invalide');
    return;
  }

  const whatsappWindow = window.open('about:blank', '_blank');
  if (whatsappWindow) whatsappWindow.opener = null;

  if (item.statut !== 'Validé') {
    const { error } = await window.supabaseDb
      .from('inscriptions')
      .update({ statut: 'Validé' })
      .eq('id', item.id);

    if (error) {
      console.error(error);
      whatsappWindow?.close();
      showToast('La confirmation n’a pas pu être enregistrée');
      return;
    }

    item.statut = 'Validé';
    render();
  }

  if (whatsappWindow) whatsappWindow.location.replace(whatsappUrl);
  else window.location.href = whatsappUrl;
  showToast('Confirmation enregistrée — ouverture de WhatsApp');
}

function showDetails(item) {
  const fields = [
    ['Nom complet', [item.prenom, item.nom, item.postnom].filter(Boolean).join(' ')],
    ['Sexe', item.sexe], ['Téléphone', item.telephone], ['E-mail', item.email],
    ['Université / Institut', item.universite], ['Faculté / Filière', item.faculte],
    ['Niveau d’étude', item.niveauEtude], ['Entreprise', item.entreprise || '—'],
    ['Fonction', item.fonction || '—'],
    ['Date d’inscription', formatDate(item.dateInscription || Date.now())],
    ['Statut', item.statut || 'Nouveau']
  ];
  $('#details').innerHTML = fields.map(([label, value], index) =>
    `<div class="detail ${index === 0 ? 'full' : ''}"><label>${esc(label)}</label><div>${esc(value || '—')}</div></div>`
  ).join('');
  $('#detailModal').classList.add('open');
}

function exportCSV() {
  const data = filteredData();
  if (!data.length) { showToast('Aucune donnée à exporter'); return; }
  const columns = [
    ['Prénom', 'prenom'], ['Nom', 'nom'], ['Postnom', 'postnom'], ['Sexe', 'sexe'],
    ['Téléphone', 'telephone'], ['E-mail', 'email'], ['Université', 'universite'],
    ['Faculté', 'faculte'], ['Niveau', 'niveauEtude'], ['Entreprise', 'entreprise'],
    ['Fonction', 'fonction'], ['Statut', 'statut'], ['Date', 'dateInscription']
  ];
  const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [
    columns.map(column => quote(column[0])).join(';'),
    ...data.map(row => columns.map(column => quote(row[column[1]])).join(';'))
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `inscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Export CSV téléchargé');
}

async function deleteInscription(item) {
  if (!confirm(`Supprimer l'inscription de ${item.prenom || ''} ${item.nom || ''} ?`)) return;
  const { error } = await window.supabaseDb.from('inscriptions').delete().eq('id', item.id);
  if (error) {
    console.error(error);
    showToast('La suppression a échoué');
    return;
  }
  inscriptions = inscriptions.filter(entry => entry.id !== item.id);
  render();
  showToast('Inscription supprimée');
}

async function initializeDashboard() {
  if (!window.supabaseConfigured) {
    $('#resultLabel').textContent = 'Configurez supabase-config.js pour charger les inscriptions.';
    showToast('Supabase n’est pas encore configuré');
    return;
  }
  await loadInscriptions();
}

tableBody.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const item = inscriptions.find(entry => entry.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'view') showDetails(item);
  if (button.dataset.action === 'status') await cycleStatus(item);
  if (button.dataset.action === 'confirm') await confirmViaWhatsApp(item);
  if (button.dataset.action === 'delete') await deleteInscription(item);
});

['#searchInput', '#statusFilter', '#levelFilter'].forEach(selector =>
  $(selector).addEventListener(selector === '#searchInput' ? 'input' : 'change', render)
);
$('#exportBtn').addEventListener('click', exportCSV);
$('#exportSide').addEventListener('click', exportCSV);
$('#closeModal').addEventListener('click', () => $('#detailModal').classList.remove('open'));
$('#detailModal').addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.classList.remove('open');
});
$('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    $('#detailModal').classList.remove('open');
    $('#sidebar').classList.remove('open');
  }
});

initializeDashboard();
