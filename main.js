
const ConnectToBinanceAPI = require("./BinanceAPI")
const ConnectToBittrexAPI = require("./BittrexAPI")
const ConnectToHitBTCAPI = require("./HitBTCAPI")
const nodemailer = require('nodemailer');
const _ = require("lodash")

const CumulativeInvestment = 10;
const BTCMin = 0; // 0.00334519  // around 30 dollars
const ETHMin = 0; // 0.06602400 // around 30 dollars
const DiffMin = 15;

let tradecounter = 0;
let tradecounterWait = 0;

const incre = 0.15 / 100;
const PriceAdj = 1 + incre;
const PriceAdj2 = 1 - incre;

class Main {

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      
    condition(value) {
        if (value > 1000) {
          return 0;
        }
        return value;
      }
      
    sendEmail(subject, body) {
        const transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'your_email@gmail.com',
            pass: 'your_password',
          },
        });
      
        const mailOptions = {
          from: 'your_email@gmail.com',
          to: 'recipient@example.com',
          subject,
          text: body,
        };
      
        transporter.sendMail(mailOptions, (error) => {
          if (error) {
            console.error('Error sending email:', error);
          } else {
            console.log('Email sent successfully');
          }
        });
      }

    async start(symbol2 = "BTC-DAI"){

        while (true){

            console.log("...")
            var fprice = function () { return true; };
            var fil = function () { return true; };
            let Exchanges = ["Bittrex", "HitBTC", "Binance"];

           
            let [BittrexPriceList, HitBTCPriceList, BinancePriceList] = await Promise.all([
                
                
                ConnectToBittrexAPI.populateBittrexPriceList(),
                ConnectToHitBTCAPI.populateHitBTCPriceList(),
                ConnectToBinanceAPI.populateBinancePriceList()
                
            ]);

            Object.defineProperty(fprice, `BittrexPriceList`, {value: BittrexPriceList, writable: true});
            Object.defineProperty(fprice, `HitBTCPriceList`, {value: HitBTCPriceList, writable: true});
            Object.defineProperty(fprice, `BinancePriceList`, {value: BinancePriceList, writable: true});


            let unionSymbol = _.intersection(BittrexPriceList.symbol, HitBTCPriceList.symbol);

            console.log("111", unionSymbol)

            let found = _.findIndex(unionSymbol, (e) => {
                return e == symbol2;
            }, 0);

            if (found < 0){
                await this.sleep(5000)
                return
            }


            for (var index = 0; index < Exchanges.length; index++) {
                const exchange = Exchanges[index];
                Object.defineProperty(fil, `filtered${exchange}PriceList`, {value: {
                  symbol: [], asks: [], bids: []
                 }, writable: true});
            }

            for (var index = 0; index < unionSymbol.length; index++) {
                var symbol = unionSymbol[index]

                for (var index2 = 0; index2 < Exchanges.length; index2++) {
                    var exchange = Exchanges[index2];
                    let foundIndex = _.findIndex(fprice[`${exchange}PriceList`].symbol, (e) => {
                      return e == symbol;
                    }, 0)
                    fil[`filtered${exchange}PriceList`].symbol.push(symbol)
                    fil[`filtered${exchange}PriceList`].asks.push(fprice[`${exchange}PriceList`].AskPrice[foundIndex])
                    fil[`filtered${exchange}PriceList`].bids.push(fprice[`${exchange}PriceList`].BidPrice[foundIndex])
                }
            }

            for (var index = 0; index < Exchanges.length; index++) {
              var exchange = Exchanges[index];
              console.log(fil[`filtered${exchange}PriceList`])
              
            }


            await this.sleep(5000)
         }
        
    }

}

module.exports = new Main()

async function start (){
    await module.exports.start()
}

start()

