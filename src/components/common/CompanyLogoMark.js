import React from 'react';
import companyLogo from '../../assets/images/company_logo-01.jpg';

/**
 * Company Logo Mark Component
 * Displays company logo as a watermark/mark in bottom-right corner
 * Similar to how most companies add their logo mark
 */
function CompanyLogoMark() {
  return (
    <div className="company-logo-mark">
      <img 
        src={companyLogo} 
        alt="Company Logo" 
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
        }}
      />
    </div>
  );
}

export default CompanyLogoMark;
