import React from 'react';

/**
 * Company Logo Mark Component
 * Displays "powered by CGMSCL" text as a watermark/mark in bottom-right corner
 */
function CompanyLogoMark() {
  return (
    <div className="company-logo-mark">
      <span className="powered-by-text">Powered by</span>
      <span className="company-name-text">CGMSCL</span>
    </div>
  );
}

export default CompanyLogoMark;
