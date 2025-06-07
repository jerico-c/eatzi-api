'use strict';

// Impor library
require('dotenv').config();
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const { Pool } = require('pg');

// --- PERBAIKAN DI SINI ---
// Konfigurasi koneksi database dengan opsi SSL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Baris ini penting untuk koneksi ke database di cloud (Railway, Supabase, dll.)
    ssl: {
        rejectUnauthorized: false
    }
});
// --- AKHIR PERBAIKAN ---

// Ambil daftar URL yang diizinkan dari environment variable
const allowedOrigins = (process.env.CORS_ORIGIN_FRONTEND || 'http://localhost:8080','https://eatzi.netlify.app').split(',');

const init = async () => {
    // Buat instance server
    const server = Hapi.server({
        port: process.env.PORT || 4000,
        host: '0.0.0.0', 
        routes: {
            cors: {
                origin: allowedOrigins,
            },
        },
    });

    // Definisikan Routes (URL API)
    server.route([
        {
            method: 'GET',
            path: '/testimonials',
            handler: async (request, h) => {
                try {
                    const { rows } = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
                    return h.response(rows);
                } catch (err) {
                    console.error('Database query error:', err);
                    return h.response({ message: 'Internal Server Error' }).code(500);
                }
            }
        },
        // ... Rute POST, PUT, DELETE tetap sama ...
        {
            method: 'POST',
            path: '/testimonials',
            handler: async (request, h) => {
                try {
                    const { name, story } = request.payload;
                    const { rows } = await pool.query(
                        'INSERT INTO testimonials (name, story) VALUES ($1, $2) RETURNING *',
                        [name, story]
                    );
                    return h.response(rows[0]).code(201);
                } catch (err) {
                    console.error('Database insert error:', err);
                    return h.response({ message: 'Internal Server Error' }).code(500);
                }
            },
            options: {
                validate: {
                    payload: Joi.object({
                        name: Joi.string().min(3).max(100).required(),
                        story: Joi.string().min(10).required(),
                    })
                }
            }
        },
    ]);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

init();
