const form = document.getElementById('registrationForm');
const pageShell = document.querySelector('.page-shell');
const formView = document.getElementById('formView');
const successBox = document.getElementById('successBox');
const successName = document.getElementById('successName');
const newRegistration = document.getElementById('newRegistration');
const submitButton = form.querySelector('[type="submit"]');
const invitationCard = document.getElementById('invitationCard');
const invitationName = document.getElementById('invitationName');
const invitationReference = document.getElementById('invitationReference');
const downloadPngButton = document.getElementById('downloadPng');
const downloadPdfButton = document.getElementById('downloadPdf');
let invitationFileName = 'invitation-ingenieurs-du-futur';

function safeFileName(value) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function prepareInvitation(values) {
  const fullName = [values.nom, values.postnom, values.prenom].filter(Boolean).join(' ');
  const reference = `IDF-${Date.now().toString(36).toUpperCase()}`;

  invitationName.textContent = fullName;
  invitationReference.textContent = reference;
  invitationFileName = `invitation-${safeFileName(fullName) || 'participant'}`;
  return { fullName, reference };
}

async function renderInvitationCanvas() {
  if (!window.html2canvas) throw new Error('Le module de création d’image est indisponible.');
  await document.fonts?.ready;
  return window.html2canvas(invitationCard, {
    scale: Math.min(window.devicePixelRatio || 2, 3),
    backgroundColor: '#dfe8fb',
    useCORS: true,
    logging: false
  });
}

async function withBusyButton(button, label, action) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { await action(); }
  catch (error) {
    console.error(error);
    alert('Le téléchargement a échoué. Vérifiez votre connexion puis réessayez.');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function validateField(input) {
  const field = input.closest('.field');
  const error = field.querySelector('.error');
  const value = input.value.trim();
  let message = '';

  if (input.required && !value) message = 'Ce champ est obligatoire.';
  else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'Saisissez une adresse e-mail valide.';
  else if (input.type === 'tel' && !/^[+\d][\d\s().-]{7,19}$/.test(value)) message = 'Saisissez un numéro de téléphone valide.';

  field.classList.toggle('invalid', Boolean(message));
  error.textContent = message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
  return !message;
}

form.querySelectorAll('input, select').forEach(input => {
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => {
    if (input.closest('.field').classList.contains('invalid')) validateField(input);
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const inputs = [...form.querySelectorAll('input, select')];
  if (!inputs.map(validateField).every(Boolean)) {
    form.querySelector('.invalid input, .invalid select')?.focus();
    return;
  }

  if (!window.supabaseConfigured) {
    alert('Supabase n’est pas encore configuré. Renseignez supabase-config.js.');
    return;
  }

  const values = Object.fromEntries(new FormData(form).entries());
  const payload = {
    nom: values.nom,
    postnom: values.postnom,
    prenom: values.prenom,
    sexe: values.sexe,
    telephone: values.telephone,
    email: values.email,
    entreprise: values.entreprise || null,
    fonction: values.fonction || null,
    universite: values.universite,
    faculte: values.faculte,
    niveau_etude: values.niveauEtude
  };

  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Enregistrement…';

  try {
    const { error } = await window.supabaseDb
      .from('inscriptions')
      .insert(payload);
    if (error) throw error;
    successName.textContent = values.prenom;
    prepareInvitation(values);
    formView.hidden = true;
    pageShell.classList.add('ticket-mode');
    successBox.classList.add('show');
    successBox.scrollTop = 0;
  } catch (error) {
    console.error(error);
    alert("L’inscription n’a pas pu être enregistrée. Vérifiez votre connexion ou la configuration Supabase.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});

downloadPngButton.addEventListener('click', () => withBusyButton(downloadPngButton, 'Création…', async () => {
  const canvas = await renderInvitationCanvas();
  const link = document.createElement('a');
  link.download = `${invitationFileName}.png`;
  link.href = canvas.toDataURL('image/png', 1);
  link.click();
}));

downloadPdfButton.addEventListener('click', () => withBusyButton(downloadPdfButton, 'Création…', async () => {
  if (!window.jspdf?.jsPDF) throw new Error('Le module PDF est indisponible.');
  const canvas = await renderInvitationCanvas();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height);
  pdf.save(`${invitationFileName}.pdf`);
}));

newRegistration.addEventListener('click', () => {
  form.reset();
  form.querySelectorAll('.field').forEach(field => field.classList.remove('invalid'));
  form.querySelectorAll('.error').forEach(error => { error.textContent = ''; });
  successBox.classList.remove('show');
  pageShell.classList.remove('ticket-mode');
  formView.hidden = false;
  document.getElementById('nom').focus();
});
