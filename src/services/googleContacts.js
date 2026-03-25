const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class GoogleContactsService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URL
    );
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/user.emails.read'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async getContacts(accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    
    const service = google.people({ version: 'v1', auth: this.oauth2Client });
    
    const response = await service.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,phoneNumbers,emailAddresses,addresses'
    });

    const contacts = response.data.connections || [];
    
    return contacts.map(contact => ({
      name: contact.names?.[0]?.displayName || 'Sem nome',
      phone: this.extractPhone(contact.phoneNumbers?.[0]?.value),
      email: contact.emailAddresses?.[0]?.value,
      address: contact.addresses?.[0]?.formattedValue
    }));
  }

  extractPhone(phone) {
    if (!phone) return null;
    // Remove caracteres especiais
    return phone.replace(/\D/g, '');
  }

  async importContacts(userId, accessToken) {
    try {
      const contacts = await this.getContacts(accessToken);
      let imported = 0;
      let failed = 0;

      for (const contact of contacts) {
        if (!contact.phone) continue;

        try {
          await prisma.client.upsert({
            where: { googleId: contact.email || contact.phone },
            update: {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              address: contact.address
            },
            create: {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              address: contact.address,
              source: 'google',
              googleId: contact.email || contact.phone
            }
          });
          imported++;
        } catch (error) {
          console.error('Error importing contact:', error);
          failed++;
        }
      }

      return { imported, failed, total: contacts.length };
    } catch (error) {
      console.error('Error in importContacts:', error);
      throw error;
    }
  }
}

module.exports = new GoogleContactsService();
