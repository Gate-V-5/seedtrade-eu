import {useT} from '../i18n/index.jsx';
import React from 'react';
import './navigation.css';

// Links do not enable registration, change API ingress or confer reviewer rights.
export default function B2bNavigation() {
  const t=useT();
  return <details className="b2b-navigation">
    <summary><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V7h10v14M14 11h6v10M8 3v4M7 11h4M7 15h4M7 19h4M2 21h20"/></svg> {t("B2B")}</summary>
    <div className="b2b-navigation-links">
      <a href="/b2b/register">{t("Register company")}</a>
    </div>
  </details>;
}
