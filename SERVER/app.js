require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const app = express();
const fetch = require('node-fetch');
const {google} = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
});
const spreadsheetId = process.env.SPREADSHEET_ID;
const PUERTO = 4300;
const coins = process.env.COINS_LIST.split(",");

app.use(morgan('dev'));

app.get('/'/*'/:idcoin'*/, async (solicitud, respuesta) => {
    const client = await auth.getClient();
    const googleSheet = google.sheets({ version: 'v4', auth: client });
    fetch('https://api.coingecko.com/api/v3/ping').then((res) => {
        if (res.status >= 200 && res.status<300) {
            respuesta.send('<h2 style="color: green;">Conexión con CoinGecko establecida.</h2>');
            //var idcoin = solicitud.params.idcoin;
            obtenerDatos(coins);
        }else if(res.status >= 100 && res.status<200) {
            respuesta.send('<h2 style="color: blue;">Todo parece estar bien, continue</h2>');
        }else if(res.status >= 300 && res.status<400) {
            respuesta.send('<h2 style="color: yellow;">Se está redireccionando el contenido</h1>');
        }else if(res.status >= 400 && res.status<500) {
            respuesta.send('<h2 style="color: red;">Se está consultando un contenido inválido, revise nuevamente.</h2>');
        }else if(res.status >= 500 && res.status<600) {
            respuesta.send('<h2 style="color: white; background-color: black;">Error en los servidores de CoinGecko, intente más tarde</h2>');
        }else {
            respuesta.send('Error desconocido');
        }
    });
    async function obtenerDatos(coins) {
        const request = await googleSheet.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: `${process.env.ID_HOJA_RANGO}`
        });
        if(request.data.values == undefined){
            await googleSheet.spreadsheets.values.clear({
                auth,
                spreadsheetId,
                range: `${process.env.ID_HOJA_RANGO}`
            })
        }
        for (let i = 0; i < coins.length; i++) {
            await fetch(`https://api.coingecko.com/api/v3/coins/${coins[i]}/ohlc?vs_currency=usd&days=1`).then((res) => {
                return res.json();
            }).then((json) => {
                var respuestaOHLC = json;
                agregarGoogleDiario(respuestaOHLC, coins[i]);
            })   
        }
    };

    async function agregarGoogleDiario(respuestaOHLC, coins) {
        for (let i = 0; i < respuestaOHLC.length; i++) {
           respuestaOHLC[i].unshift(`${coins}`);
           respuestaOHLC[i][1] = new Date(respuestaOHLC[i][1]);
        }
        try {
            await googleSheet.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: `${process.env.ID_HOJA_RANGO}`,
                insertDataOption: 'INSERT_ROWS',
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    "range": `${process.env.ID_HOJA_RANGO}`,
                    "values": respuestaOHLC
                }
            });
            console.log("Datos Agregados");
        } catch (error) {
            console.error(error);    
        };
    };
});

app.listen(PUERTO || process.env.PORT, () => {
    console.log('Servidor OK funcionando en el puerto: ' + PUERTO||process.env.PORT);
});