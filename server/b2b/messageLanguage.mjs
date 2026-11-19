// Service-message rows reused from the UI dictionary extension; no legal translation.
const rows=[
  [
    "SeedTrade — confirm your email address",
    "SeedTrade — E-Mail-Adresse bestätigen",
    "SeedTrade — confirmez votre adresse e-mail",
    "SeedTrade — confirme su correo electrónico",
    "SeedTrade — conferma il tuo indirizzo email"
  ],
  [
    "Confirm your email address using this link (expires in 30 minutes):",
    "Bestätigen Sie Ihre E-Mail-Adresse über diesen Link (gültig für 30 Minuten):",
    "Confirmez votre adresse e-mail avec ce lien (expire dans 30 minutes) :",
    "Confirme su correo mediante este enlace (caduca en 30 minutos):",
    "Conferma l’indirizzo email con questo link (scade tra 30 minuti):"
  ],
  [
    "If you did not request this, ignore this email.",
    "Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
    "Si no lo ha solicitado, ignore este correo.",
    "Se non hai richiesto questa operazione, ignora questa email."
  ]
];
rows.push(
 ['SeedTrade — reset your password','SeedTrade — Passwort zurücksetzen','SeedTrade — réinitialisez votre mot de passe','SeedTrade — restablezca su contraseña','SeedTrade — reimposta la password'],
 ['Reset your password using this link (expires in 15 minutes):','Setzen Sie Ihr Passwort über diesen Link zurück (gültig für 15 Minuten):','Réinitialisez votre mot de passe avec ce lien (expire dans 15 minutes) :','Restablezca su contraseña mediante este enlace (caduca en 15 minutos):','Reimposta la password con questo link (scade tra 15 minuti):']
);
const codes=['EN','DE','FR','ES','IT'];
export const mailLanguage=value=>typeof value==='string'&&codes.includes(value.toUpperCase())?value.toUpperCase():'EN';
export function verificationUiMessage(code,key){const row=rows.find(row=>row[0]===key),index=codes.indexOf(mailLanguage(code));return (row?row[index]:key).replace(/^SeedTrade(?= —)/,'SEEDTRADE.EU');}
