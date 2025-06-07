'use strict';

// Impor library
require('dotenv').config();
const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const { Pool } = require('pg');

// Konfigurasi koneksi database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const init = async () => {
    // Buat instance server
    const server = Hapi.server({
        port: process.env.PORT || 4000,
        host: 'localhost',
        routes: {
            cors: { // Mengizinkan akses dari frontend React
                origin: ['https://meek-cranachan-019fc9.netlify.app/'], // Ganti dengan URL frontend Anda saat deploy
            },
        },
    });

    // Definisikan Routes (URL API)
    server.route([
        {
            method: 'GET',
            path: '/testimonials',
            handler: async (request, h) => {
                const { rows } = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
                return h.response(rows);
            }
        },
        {
            method: 'POST',
            path: '/testimonials',
            handler: async (request, h) => {
                const { name, story } = request.payload;
                const { rows } = await pool.query(
                    'INSERT INTO testimonials (name, story) VALUES ($1, $2) RETURNING *',
                    [name, story]
                );
                return h.response(rows[0]).code(201);
            },
            options: { // Validasi input
                validate: {
                    payload: Joi.object({
                        name: Joi.string().min(3).max(100).required(),
                        story: Joi.string().min(10).required(),
                    })
                }
            }
        },
        {
            method: 'PUT',
            path: '/testimonials/{id}',
            handler: async (request, h) => {
                const { id } = request.params;
                const { name, story } = request.payload;
                const { rows } = await pool.query(
                    'UPDATE testimonials SET name = $1, story = $2 WHERE id = $3 RETURNING *',
                    [name, story, id]
                );
                return h.response(rows[0]);
            },
            options: {
                validate: {
                    params: Joi.object({ id: Joi.number().integer().required() }),
                    payload: Joi.object({
                        name: Joi.string().min(3).max(100).required(),
                        story: Joi.string().min(10).required(),
                    })
                }
            }
        },
        {
            method: 'DELETE',
            path: '/testimonials/{id}',
            handler: async (request, h) => {
                const { id } = request.params;
                await pool.query('DELETE FROM testimonials WHERE id = $1', [id]);
                return h.response({ message: 'Testimonial deleted successfully' }).code(200);
            },
            options: {
                validate: {
                    params: Joi.object({ id: Joi.number().integer().required() })
                }
            }
        }
    ]);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

// Menangani error jika server gagal start
process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
