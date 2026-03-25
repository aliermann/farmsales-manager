const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.baseURL = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = process.env.EVOLUTION_INSTANCE;
  }

  async sendMessage(phone, message) {
    try {
      const response = await axios.post(
        `${this.baseURL}/message/sendText/${this.instance}`,
        {
          number: this.formatPhone(phone),
          text: message,
          options: {
            delay: 1200,
            presence: "composing"
          }
        },
        {
          headers: {
            'apikey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async sendCampaign(contacts, message, onProgress) {
    const results = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      if (contact.phone) {
        try {
          const result = await this.sendMessage(contact.phone, message);
          results.push({ contact, success: true, result });
          sent++;
        } catch (error) {
          results.push({ contact, success: false, error: error.message });
          failed++;
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: contacts.length,
          sent,
          failed
        });
      }

      // Delay between messages to avoid rate limiting
      await this.delay(2000);
    }

    return { results, sent, failed, total: contacts.length };
  }

  formatPhone(phone) {
    // Remove caracteres especiais
    let formatted = phone.replace(/\D/g, '');
    
    // Adiciona código do Brasil se não tiver
    if (formatted.length === 11 && !formatted.startsWith('55')) {
      formatted = `55${formatted}`;
    }
    
    return formatted;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getInstanceStatus() {
    try {
      const response = await axios.get(
        `${this.baseURL}/instance/connectionState/${this.instance}`,
        {
          headers: { 'apikey': this.apiKey }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error getting instance status:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
