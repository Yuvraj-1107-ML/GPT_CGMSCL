-- Converted SQL Query for MV_tender_dashboard according to schema
-- Fixed issues: TENDERSTATUS CASE logic, column names, and structure

SELECT 
    RCSTATUSITEM,
    CASE 
        WHEN TENDERSTATUS = 'NA' THEN 'New Items'
        WHEN TENDERSTATUS = 'Price Opened' THEN 'Price Opened'
        WHEN TENDERSTATUS = 'Bid Found' THEN 'Bid Found'
        ELSE TENDERSTATUS 
    END AS TENDERSTATUS,
    ITEMSTATUS,
    SUM(EDL) AS EDLS,
    ROUND(SUM(EDLValue)/100000, 2) AS EDLValue,
    SUM(NonEDL) AS NonEDLs,
    ROUND(SUM(NonEDLValue)/100000, 2) AS NonEDLValue,
    SUM(EDL) + SUM(NonEDL) AS TotalItems,
    ROUND(SUM(EDLValue)/100000, 2) + ROUND(SUM(NonEDLValue)/100000, 2) AS TotalValue,
    SUM(Above1LAcs) AS Above1LAcs,
    SUM(Below1ALcs) AS Below1ALcs,
    SUM(ACat) AS ACat,
    SUM(BCat) AS BCat,
    SUM(CCat) AS CCat,
    SUM(IPHSCount) AS IPHSCount,
    SUM(VEDV) AS VEDV,
    SUM(VEDE) AS VEDE,
    SUM(VEDD) AS VEDD
FROM (
    SELECT 
        mv.ITEMID,
        mv.RCSTATUSITEM,
        NVL(mv.TOTALAI_QTY, 0) * NVL(mv.RC_PRC_APPROXRATE, 0) AS IndentValue,
        mv.TENDERSTATUS,
        mv.SCHEMECODE AS TENDERSCHEMECODE,
        mv.ITEMSTATUS,
        CASE WHEN mv.ISEDL2025 = 'Yes' THEN 1 ELSE 0 END AS EDL,
        ROUND(CASE WHEN mv.ISEDL2025 = 'Yes' THEN NVL(mv.TOTALAI_QTY, 0) * NVL(mv.RC_PRC_APPROXRATE, 0) ELSE 0 END, 0) AS EDLValue,
        CASE WHEN mv.ISEDL2025 = 'Yes' THEN 0 ELSE 1 END AS NonEDL,
        ROUND(CASE WHEN mv.ISEDL2025 = 'Yes' THEN 0 ELSE NVL(mv.TOTALAI_QTY, 0) * NVL(mv.RC_PRC_APPROXRATE, 0) END, 0) AS NonEDLValue,
        CASE WHEN NVL(mv.TOTALAI_QTY, 0) * NVL(mv.RC_PRC_APPROXRATE, 0) >= 100000 THEN 1 ELSE 0 END AS Above1LAcs,
        CASE WHEN NVL(mv.TOTALAI_QTY, 0) * NVL(mv.RC_PRC_APPROXRATE, 0) >= 100000 THEN 0 ELSE 1 END AS Below1ALcs,
        CASE WHEN mv.ABCINDENTVALUE = 'A' THEN 1 ELSE 0 END AS ACat,
        CASE WHEN mv.ABCINDENTVALUE = 'B' THEN 1 ELSE 0 END AS BCat,
        CASE WHEN mv.ABCINDENTVALUE = 'C' THEN 1 ELSE 0 END AS CCat,
        mv.ITEMCODE,
        mv.ITEMNAME,
        mv.STRENGTH,
        mv.UNIT,
        mv.ITEMTYPENAME,
        mv.GROUPNAME,
        CASE WHEN mv.ISEDL2025 = 'Yes' THEN 'EDL' ELSE 'Non EDL' END AS EDLType,
        mv.RCSTARTITEM,
        mv.RCENDDTITEM,
        mv.LASTRCSCHEMECODE,
        mv.DAYREMAININGITEM,
        mv.LASTFLOATEDTENDERCODE,
        mv.TENDERSTARTDT,
        mv.SUBMISSIONLASTDT,
        mv.COV_A_OPDATE,
        mv.BIDFOUNDINCOVERA,
        mv.CLAIMOBJSTARTDT,
        mv.CLAIMOBJECTION_LAST,
        mv.COV_B_OPDATE,
        mv.BIDFOUNDINCOVERB,
        mv.PRICEBIDDATE,
        mv.BIDFOUNDINCOVERC,
        mv.LEAD_TIME,
        mv.RC_PRC_APPROXRATE,
        mv.TOTALAI_QTY,
        mv.DHSAI_QTY,
        mv.CMEAI_QTY,
        mv.VEDCATEGORY AS vedcat,
        -- Note: IPHSCtype column not found in schema - using placeholder
        -- If IPHS classification column exists with different name, replace this
        0 AS IPHSCount,  -- Placeholder - adjust based on actual column availability
        CASE WHEN mv.VEDCATEGORY = 'V' THEN 1 ELSE 0 END AS VEDV,
        CASE WHEN mv.VEDCATEGORY = 'E' THEN 1 ELSE 0 END AS VEDE,
        CASE WHEN mv.VEDCATEGORY = 'D' THEN 1 ELSE 0 END AS VEDD
    FROM MV_tender_dashboard mv
    WHERE 1 = 1
        AND mv.MCID = 1
        AND NVL(mv.TOTALAI_QTY, 0) > 0
        AND mv.ABCINDENTVALUE = 'A'
)
GROUP BY 
    RCSTATUSITEM, 
    CASE 
        WHEN TENDERSTATUS = 'NA' THEN 'New Items'
        WHEN TENDERSTATUS = 'Price Opened' THEN 'Price Opened'
        WHEN TENDERSTATUS = 'Bid Found' THEN 'Bid Found'
        ELSE TENDERSTATUS 
    END,
    ITEMSTATUS
ORDER BY RCSTATUSITEM, ITEMSTATUS;
