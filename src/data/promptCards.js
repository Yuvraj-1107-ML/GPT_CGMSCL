/**
 * Prompt Cards Data
 * Contains all prompt card definitions for the welcome screen
 */
export const globalPromptCards = [
  {
    id: 'tender-tracking-main',
    type: 'main',
    icon: '📋',
    title: 'Tender Tracking',
    description: 'Track tenders, rate contracts, and performance KPIs',
    prompts: [
      'Show items whose RC expires soon (<90 days)',
      'Give me all of the items which have valid rate contracts',
      'Average bids per tender?',
      'Categories with best RC coverage',
      'Categories with best RC coverage, also give me the Pareto chart for this as well',
      'EDL 2025 items vs non-EDL bids?',
      'List the worst performing tenders',
      'What is the average time taken for a tender from start to finish',
      'Which tenders are due for publication this month?'
    ]
  },
  {
    id: 'po-tracking-main',
    type: 'main',
    icon: '📦',
    title: 'PO Tracking',
    description: 'Analyze purchase orders, supplier KPIs, and delivery performance',
    prompts: [
      'Which items have supply < 50% of PO quantity?',
      'Which POs are delayed beyond delivery SLA?',
      'Which POs have partial supply (<50%)?',
      'Which items have been awarded and which are pending award?',
      'For Item Oxytocin Injection IP , has PO been issued to the vendor?',
      'What is the PO execution status of Item Oxytocin Injection IP?',
      'What is the supply status of PO for Item Multivitamin + Multimineral Syrup 200 ml ?',
      'PO-wise supply status (drug, quantity, percentage supplied).',
      'POs where partial supplies were made but balance overdue.',
      'Vendors who have defaulted in timely supply.',
      'Which POs are nearing expiry of delivery period?',
    ]
  },
  {
    id: 'tender-level-monitoring-main',
    type: 'main',
    icon: '🔍',
    title: 'Tender-level Monitoring',
    description: 'Monitor tender status, delays, vendor participation, and award status',
    prompts: [
      'What is the current status of Tender No. XYZ (stage-wise)?',
      'Which tenders are delayed and may impact supply?',
      'Which items in this tender received single-vendor bids?',
      'Vendor participation summary item-wise for this tender, tender no. 164',
      'Which items have been awarded and which are pending award?',
      'For Item Oxytocin Injection IP, has PO been issued to the vendor?',
      'Which items have supply < 50% of PO quantity?'
    ]
  },
  {
    id: 'rate-contract-critical-main',
    type: 'main',
    icon: '⏰',
    title: 'Rate Contract (RC) – Critical Questions',
    description: 'Monitor RC expiry, extensions, vendor watch, and transition requirements',
    prompts: [
      'When does the RC for Item X expire?',
      'Which RCs expire within 30/60/90 days?',
      'Items requiring immediate RC extension or fresh tendering.',
      'Which items need transition from old RC to new tender?',
      'Which RC items have repeated supply delays?',
      'Items needing emergency procurement due to RC-Tender gap.'
    ]
  },
  // {
  //   id: 'procurement-execution-main',
  //   type: 'main',
  //   icon: '✅',
  //   title: 'Procurement Execution (PO, Supply, Vendor Performance)',
  //   description: 'Track QC status, NSQ items, hold batches, and vendor performance',
  //   prompts: [
  //     'Item-wise QC hold batches blocking supply.',
  //     'Vendors whose QC failures are delaying supplies for tender/RC items.'
  //   ]
  // },
  {
    id: 'high-priority-exceptions-main',
    type: 'main',
    icon: '🚨',
    title: 'High-Priority Exception & Alert Questions',
    description: 'Identify critical shortages, stockout risks, and urgent procurement needs',
    prompts: [
      'Which items are in critical shortage despite an active tender/RC?',
      'Which items are stuck due to tender delay + RC expiry overlap?'
    ]
  }
];

export const extendedPromptCards = [
  {
    id: 'anomaly-detection',
    type: 'extended',
    icon: '🔍',
    title: 'Anomaly Detection',
    description: 'Analyze and identify unusual patterns or behaviors',
    prompts: [
      'show me medicines expiring in 2025 that are below reorder level and from LifeLine Suppliers',
      'which category has the most medicines expiring in 2025 and what is their total stock value',
      'show me warehouses with medicines expiring in 2025, sorted by total expiring stock value'
    ]
  },
  {
    id: 'stock-analysis',
    type: 'extended',
    icon: '🛠️',
    title: 'Stock Analysis',
    description: 'Investigate and analyze stock levels and patterns',
    prompts: [
      'tell me what medicines are going to be expired within 2025 year',
      'show me medicines expiring in 2026',
      'show me products with low stock'
    ]
  },
  {
    id: 'inventory-management',
    type: 'extended',
    icon: '📦',
    title: 'Inventory Management',
    description: 'Track and optimize inventory levels and distribution',
    prompts: [
      'show me warehouses with medicines expiring in 2025, sorted by total expiring stock value',
      'which suppliers have medicines expiring in 2025 and what is the total value at risk',
      'which products have multiple batches expiring in 2025 and what is the total stock across all batches'
    ]
  },
  {
    id: 'asset-management',
    type: 'extended',
    icon: '🏢',
    title: 'Asset Management',
    description: 'Optimize asset utilization and lifecycle management',
    prompts: [
      'which warehouses have the most medicines expiring in 2025',
      'show me a bar graph of stock value of medicines expiring in 2025 by warehouse',
      'what plants are in the system'
    ]
  },
  {
    id: 'visual-analytics',
    type: 'extended',
    icon: '📅',
    title: 'Visual Analytics',
    description: 'Visualize data with charts and graphs',
    prompts: [
      'show me a bar chart of medicines expiring by month in 2025',
      'create a bar chart showing expiring medicines by category in 2025',
      'generate a pareto chart for medicines expiring in 2025 by stock value'
    ]
  },
  {
    id: 'data-summarization',
    type: 'extended',
    icon: '📈',
    title: 'Data Summarization and Reporting',
    description: 'Generate comprehensive data summaries',
    prompts: [
      'show me summary of expiring medicines: count by category, total stock value, and average stock per medicine for 2025',
      'show me medicines expiring in 2025 with their batch numbers, stock levels, and days until expiry',
      'which products have multiple batches expiring in 2025 and what is the total stock across all batches'
    ]
  }
];

export const suggestionPills = [
  'Show me more details about this data',
  'What are the trends over time?',
  'Compare this with other equipment'
];

