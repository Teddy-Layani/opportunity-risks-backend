/**
 * SAP CRM Service - Handles all communication with SAP Sales Cloud V2 API
 */

class SapCrmService {
  constructor() {
    this.baseURL = process.env.SAP_CRM_BASE_URL || 'https://my1001209.de1.demo.crm.cloud.sap';
    this.endpoint = process.env.SAP_CRM_ENDPOINT || '/sap/c4c/api/v1/opportunity-service/opportunities';
    this.username = process.env.SAP_CRM_USERNAME;
    this.password = process.env.SAP_CRM_PASSWORD;

    this.headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'DataServiceVersion': '2.0'
    };
  }

  /**
   * Get authorization header for Basic Auth
   */
  getAuthHeader() {
    if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      return `Basic ${auth}`;
    }
    return null;
  }

  /**
   * Build fetch options with authentication
   */
  getFetchOptions(method = 'GET') {
    const options = {
      method,
      headers: { ...this.headers }
    };

    const authHeader = this.getAuthHeader();
    if (authHeader) {
      options.headers['Authorization'] = authHeader;
    }

    return options;
  }

  /**
   * Fetch all opportunities from SAP CRM
   * @param {Object} params - Query parameters (top, skip, filter)
   */
  async fetchAllOpportunities(params = {}) {
    const { top = 100, skip = 0 } = params;

    const url = `${this.baseURL}${this.endpoint}?$top=${top}&$skip=${skip}`;
    console.log(`[SAP CRM] Fetching opportunities from: ${url}`);

    try {
      const response = await fetch(url, this.getFetchOptions());

      console.log(`[SAP CRM] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Extract results from different possible structures
      let results = [];
      if (data.d && data.d.results) {
        results = data.d.results;
      } else if (data.value) {
        results = data.value;
      } else if (Array.isArray(data)) {
        results = data;
      }

      console.log(`[SAP CRM] Found ${results.length} opportunities`);

      return results.map(item => this.transformOpportunity(item));
    } catch (error) {
      console.error('[SAP CRM] Error fetching opportunities:', error.message);
      throw error;
    }
  }

  /**
   * Fetch a specific opportunity by ID
   * @param {string} id - Opportunity ID
   */
  async fetchOpportunityById(id) {
    // Try direct API call first
    const url = `${this.baseURL}${this.endpoint}/${id}`;
    console.log(`[SAP CRM] Fetching opportunity: ${url}`);

    try {
      const response = await fetch(url, this.getFetchOptions());

      console.log(`[SAP CRM] Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();

        if (data && (data.id || data.ObjectID || data.ID || data.value)) {
          // Handle if response is wrapped in 'value'
          const oppData = data.value || data;
          console.log(`[SAP CRM] Found opportunity: ${oppData.name || oppData.Name || id}`);
          return this.transformOpportunity(oppData);
        }
      }

      // Fallback: fetch from list and filter
      console.log(`[SAP CRM] Direct fetch failed, trying list fallback...`);
      return await this.fetchOpportunityFromList(id);

    } catch (error) {
      console.error(`[SAP CRM] Error fetching opportunity ${id}:`, error.message);
      // Try fallback on error
      console.log(`[SAP CRM] Trying list fallback after error...`);
      return await this.fetchOpportunityFromList(id);
    }
  }

  /**
   * Fallback: Fetch opportunity from list and filter by ID
   * @param {string} id - Opportunity ID to find
   */
  async fetchOpportunityFromList(id) {
    try {
      const opportunities = await this.fetchAllOpportunities({ top: 100 });

      const found = opportunities.find(opp =>
        opp.objectID === id ||
        opp.opportunityID === id ||
        opp.objectID?.toLowerCase() === id.toLowerCase()
      );

      if (found) {
        console.log(`[SAP CRM] Found opportunity via list: ${found.name}`);
        return found;
      }

      console.log(`[SAP CRM] Opportunity ${id} not found in list`);
      return null;
    } catch (error) {
      console.error(`[SAP CRM] List fallback failed:`, error.message);
      return null;
    }
  }

  /**
   * Transform SAP CRM opportunity data to our model format
   * @param {Object} item - Raw SAP CRM opportunity data
   */
  transformOpportunity(item) {
    return {
      // IDs
      objectID: item.id || item.ObjectID || item.ID,
      opportunityID: item.displayId || item.OpportunityID || item.OpportunityNumber || item.id,

      // Basic Info
      name: item.name || item.Name || item.Description || item.title || 'Unnamed Opportunity',
      accountID: (item.account && item.account.id) || item.AccountID || item.Account || null,

      // Sales Info
      salesStage: this.mapSalesStage(item.status || item.statusDescription || item.SalesStage || item.ProcessingStatusCodeText),
      expectedRevenueAmount: this.extractRevenue(item),
      currency: this.extractCurrency(item),

      // Dates
      closeDate: item.closeDate || item.CloseDate || item.ExpectedClosingDate || item.ClosingDate || null,

      // Metadata
      source: 'sap_crm',
      sapRawData: {
        status: item.status,
        statusDescription: item.statusDescription,
        phase: item.phase,
        phaseDescription: item.phaseDescription,
        priority: item.priority,
        priorityDescription: item.priorityDescription
      }
    };
  }

  /**
   * Map SAP CRM status to our sales stage enum
   */
  mapSalesStage(status) {
    if (!status) return 'Qualified';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('won') || statusLower.includes('closed won')) {
      return 'Won';
    }
    if (statusLower.includes('lost') || statusLower.includes('closed lost')) {
      return 'Lost';
    }
    if (statusLower.includes('negotiation') || statusLower.includes('negotiate')) {
      return 'Negotiation';
    }
    if (statusLower.includes('proposal') || statusLower.includes('quote')) {
      return 'Proposal';
    }
    if (statusLower.includes('qualified') || statusLower.includes('open')) {
      return 'Qualified';
    }

    // Default mapping based on common SAP statuses
    return 'Qualified';
  }

  /**
   * Extract revenue amount from SAP CRM data
   */
  extractRevenue(item) {
    if (item.expectedRevenueAmount && item.expectedRevenueAmount.content) {
      return parseFloat(item.expectedRevenueAmount.content) || 0;
    }
    if (item.ExpectedRevenueAmount) {
      return parseFloat(item.ExpectedRevenueAmount) || 0;
    }
    if (item.ExpectedValue) {
      return parseFloat(item.ExpectedValue) || 0;
    }
    if (item.Amount) {
      return parseFloat(item.Amount) || 0;
    }
    return 0;
  }

  /**
   * Extract currency from SAP CRM data
   */
  extractCurrency(item) {
    if (item.expectedRevenueAmount && item.expectedRevenueAmount.currencyCode) {
      return item.expectedRevenueAmount.currencyCode;
    }
    return item.Currency || item.CurrencyCodeText || 'USD';
  }

  /**
   * Test the SAP CRM connection
   */
  async testConnection() {
    try {
      const url = `${this.baseURL}${this.endpoint}?$top=1`;
      console.log(`[SAP CRM] Testing connection to: ${url}`);

      const response = await fetch(url, this.getFetchOptions());

      if (response.ok) {
        console.log('[SAP CRM] Connection successful!');
        return { success: true, status: response.status };
      } else {
        console.log(`[SAP CRM] Connection failed with status: ${response.status}`);
        return { success: false, status: response.status, error: response.statusText };
      }
    } catch (error) {
      console.error('[SAP CRM] Connection test failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new SapCrmService();
