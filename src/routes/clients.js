const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const googleContacts = require('../services/googleContacts');

const prisma = new PrismaClient();

// Listar clientes
router.get('/', async (req, res) => {
  try {
    const { search, source, page = 1, limit = 20 } = req.query;
    
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }
    
    if (source) {
      where.source = source;
    }
    
    const clients = await prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.client.count({ where });
    
    res.json({
      clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Criar cliente
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        source: 'manual'
      }
    });
    
    res.status(201).json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Importar do Google
router.post('/import-google', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    const result = await googleContacts.importContacts(req.user?.id, accessToken);
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error importing contacts' });
  }
});

module.exports = router;
