/**
 © Copyright IBM Corp. 2019, 2019

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const request = require('request');

const USER_ERRORS = require('../libs/users.js').USERS_ERRORS;

/**
 * Creates an express router representing a Users REST API for managing DMV users.
 * @param {object} users_instance An instance of the Users class with a backend user database.
 * @param {object} ev Information about the app to pass to the UI.
 * @param {Middleware} middleware Authentication middleware used to protect API endpoints.
 * @returns {object} An express router for the users API.
 */
exports.createRouter = function (users_instance, ev, middleware) {

	const router = express.Router();
	router.use(bodyParser.urlencoded({extended: true}));
	router.use(bodyParser.json());
	router.use(bodyParser.text());
	router.use(compression());

	router.get('/', (req, res, next) => {
		res.redirect('/login');
	});

	// Status url for monitoring
	router.get('/status', (req, res, next) => {
		res.json({
			message: 'LEI Issuer is running',
			status: 'OK'
		});
	});

	// Login page
	router.get('/login', (req, res, next) => {
		if (req.session && req.session.user_id)
			return res.redirect('/logout');

		res.render('login', {title: 'Bloomberg'});
	});

	// Admin page
	router.get('/admin', [ middleware.is_admin ], (req, res, next) => {
		res.render('admin', {title: 'Bloomberg Administration'});
	});

	// Edit info for a single user
	router.get('/users/:user_id/edit', [ middleware.is_admin ], async (req, res, next) => {
		const user_id = req.params.user_id;
		try {
			const user_doc = await users_instance.read_user(user_id);
			res.render('user_edit', {title: 'Edit User', user_id: user_id, user_doc: user_doc});

		} catch (error) {
			let status = 500;
			if (error.code === USER_ERRORS.USER_DOES_NOT_EXIST)
				status = 404;
			return res.status(status).send({error: error.code, reason: error.message});
		}
	});

	// View the account page for a specific user
	router.get('/account', [ middleware.user_authentication ], async (req, res, next) => {
		const user_id = req.session.user_id;
		try {
			const user_doc = await users_instance.read_user(user_id);
			res.render('user', {title: 'My Bloomberg', user_id: user_id, user_doc: user_doc});

		} catch (error) {
			let status = 500;
			if (error.code === USER_ERRORS.USER_DOES_NOT_EXIST)
				status = 404;
			return res.status(status).send({error: error.code, reason: error.message});
		}
	});

	// Lookup LEI number from GLEIF
	router.get('/leinumber/:lei_number', [ middleware.is_admin_or_user ], async (req, res, next) => {
		const lei_number = req.params.lei_number;
		try {
			const httpResponse = res;
			request({
				url: `https://leilookup.gleif.org/api/v2/leirecords?lei=${lei_number}`,
				method: 'GET',
				json: true 
			}, function (error, response, leiInfoArray) {
				if (error) {
					console.debug(`Failed to find LEI info for ${lei_number}: ${JSON.stringify(error)}`);
					return httpResponse.status(500).sent({error: error.code, reason: error.message});
				}
				console.log(`Found LEI info for: ${lei_number}: ${JSON.stringify(leiInfoArray)}`);
				// make sure an array is coming back with only one item (since only one
				//  lei_number in the search)
				if (leiInfoArray && Array.isArray(leiInfoArray) && leiInfoArray.length === 1) {
					const leiInfo = leiInfoArray[0];
					let user_record = {};
					user_record.LEI = leiInfo.LEI.$;
					user_record.legal_name = leiInfo.Entity.LegalName.$;
					user_record.address_line_1 = leiInfo.Entity.LegalAddress.FirstAddressLine.$;
					user_record.city = leiInfo.Entity.LegalAddress.City.$;
					user_record.state = leiInfo.Entity.LegalAddress.Region ? leiInfo.Entity.LegalAddress.Region.$ : "-";
					user_record.zip_code = leiInfo.Entity.LegalAddress.PostalCode.$;
					user_record.country = leiInfo.Entity.LegalAddress.Country.$;

					return httpResponse.json(user_record);
				}
				return httpResponse.status(500).json({message: "lei search returned no information"});
			});
		} catch (error) {
			console.debug(`Failed to find LEI info for ${lei_number}: ${JSON.stringify(error)}`);
			return res.status(500).sent({error: error.code, reason: error.message});
		}

	});

	return router;
};
