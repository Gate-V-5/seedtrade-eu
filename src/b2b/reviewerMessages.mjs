const rows=[
['Company review is unavailable for this account.','Die Unternehmensprüfung ist für dieses Konto nicht verfügbar.','La vérification des entreprises est indisponible pour ce compte.','La revisión de empresas no está disponible para esta cuenta.','La verifica aziendale non è disponibile per questo account.'],
['Company review — SEEDTRADE.EU Administration','Unternehmensprüfung — SEEDTRADE.EU Administration','Vérification des entreprises — SEEDTRADE.EU Administration','Revisión de empresas — SEEDTRADE.EU Administration','Verifica aziendale — SEEDTRADE.EU Administration'],
['Use actual company evidence. Do not review your own company or a company where you have a conflict of interest.','Verwenden Sie tatsächliche Unternehmensnachweise. Prüfen Sie weder Ihr eigenes Unternehmen noch eines, bei dem ein Interessenkonflikt besteht.','Utilisez des justificatifs réels. N’examinez ni votre propre entreprise ni une entreprise présentant un conflit d’intérêts.','Utilice pruebas reales de la empresa. No revise su propia empresa ni una empresa con conflicto de intereses.','Usa documenti aziendali reali. Non verificare la tua azienda o un’azienda in conflitto di interessi.'],
['Company profile needs completion before approval.','Das Unternehmensprofil muss vor der Freigabe vervollständigt werden.','Le profil de l’entreprise doit être complété avant approbation.','El perfil empresarial debe completarse antes de su aprobación.','Il profilo aziendale deve essere completato prima dell’approvazione.'],
['Choose a review decision','Prüfentscheidung auswählen','Choisissez une décision','Seleccione una decisión','Scegli una decisione'],
['Review decision','Prüfentscheidung','Décision de vérification','Decisión de revisión','Decisione di verifica'],
['Approve company','Unternehmen freigeben','Approuver l’entreprise','Aprobar empresa','Approva azienda'],
['Request more information','Weitere Informationen anfordern','Demander des informations complémentaires','Solicitar más información','Richiedi maggiori informazioni'],
['Reject company','Unternehmen ablehnen','Refuser l’entreprise','Rechazar empresa','Rifiuta azienda'],
['Decision reason','Begründung','Motif de la décision','Motivo de la decisión','Motivo della decisione'],
['Record review decision','Prüfentscheidung speichern','Enregistrer la décision','Registrar decisión de revisión','Registra decisione'],
['Could not load company reviews. Please try again.','Unternehmensprüfungen konnten nicht geladen werden. Versuchen Sie es erneut.','Impossible de charger les vérifications. Réessayez.','No se pudieron cargar las revisiones. Inténtelo de nuevo.','Impossibile caricare le verifiche. Riprova.'],
['Review not saved. Refresh and check the company evidence.','Prüfung nicht gespeichert. Aktualisieren Sie die Ansicht und prüfen Sie die Nachweise.','Décision non enregistrée. Actualisez et vérifiez les justificatifs.','Revisión no guardada. Actualice y compruebe las pruebas.','Verifica non salvata. Aggiorna e controlla i documenti.']
];
export const reviewerMessages=Object.fromEntries(['EN','DE','FR','ES','IT'].map((l,i)=>[l,Object.fromEntries(rows.map(r=>[r[0],r[i]]))]));

const confirmations={EN:'I confirm that I have no conflict of interest for this review.',DE:'Ich bestätige, dass für diese Prüfung kein Interessenkonflikt besteht.',FR:'Je confirme l’absence de conflit d’intérêts pour cet examen.',ES:'Confirmo que no tengo conflicto de intereses en esta revisión.',IT:'Confermo di non avere conflitti di interesse per questa verifica.'};
for(const [lang,value] of Object.entries(confirmations))reviewerMessages[lang]['I confirm that I have no conflict of interest for this review.']=value;
