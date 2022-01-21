require('dotenv').config();
const fetch = require('node-fetch');
const {google} = require('googleapis');
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets'
});
const spreadsheetId = process.env.SPREADSHEET_ID;

exports.handler = async (event) => {
    const client = await auth.getClient();
    const googleSheet = google.sheets({ version: 'v4', auth: client });
    const promise = new Promise(async function (){
         var datosAlmacenados = [];
        const coins = process.env.COINS_LIST.split(",");
        for (let i = 0; i < coins.length; i++) {
            await fetch(`https://api.coingecko.com/api/v3/coins/${coins[i]}/ohlc?vs_currency=usd&days=365`).then((res) => {
                return res.json();
            }).then((json) => {
                var respuestaOHLC = json;
                for (let x = 0; x < respuestaOHLC.length; x++) {
                    respuestaOHLC[x].unshift(`${coins[i]}`);
                    respuestaOHLC[x][1] = new Date(respuestaOHLC[x][1]);
                    datosAlmacenados.push(respuestaOHLC[x]);
                }
                if (i === coins.length-1) {
                    async function llamarDatos() {
                        const request = (await googleSheet.spreadsheets.values.get({
                            auth,
                            spreadsheetId,
                            range: `${process.env.ID_HOJA_RANGO_ANUAL}`
                        })).data;
                        if (request.values === undefined) {
                            request.values = 0;
                        }
                        if (request.values.length === datosAlmacenados.length) {
                            await actualizarGoogleDiario(datosAlmacenados, coins);
                        } else {
                            await agregarGoogleDiario(datosAlmacenados, coins);
                        }
                    }
                    llamarDatos();
                }
            })   
        }
    });

    async function agregarGoogleDiario(datosAlmacenados, coins) {
        try {
            (await googleSheet.spreadsheets.values.clear({
                auth,
                spreadsheetId,
                range: `${process.env.ID_HOJA_RANGO_ANUAL}`
            })).data;
            console.log('Valores de filas eliminados...');
            (await googleSheet.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: `${process.env.ID_HOJA_RANGO_ANUAL}`,
                insertDataOption: 'OVERWRITE',
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    "range": `${process.env.ID_HOJA_RANGO_ANUAL}`,
                    "values": datosAlmacenados
                }
            })).data;
            console.log(`Se agregaron los siguientes coins: ${coins.join(', ')}. ${datosAlmacenados.length} filas agregadas`);
        } catch (error) {
            console.error(error);    
        };
    };

    async function actualizarGoogleDiario(datosAlmacenados, coins) {
        try {
            (await googleSheet.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `${process.env.ID_HOJA_RANGO_ANUAL}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    "range": `${process.env.ID_HOJA_RANGO_ANUAL}`,
                    "values": datosAlmacenados
                }
            })).data;
            console.log(`Se actualizaron las siguientes coins: ${coins.join(', ')}. ${datosAlmacenados.length} filas actualizadas`);
        } catch (error) {
            console.error(error);    
        };
    };

    return promise;
};