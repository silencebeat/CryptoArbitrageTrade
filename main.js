
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

    async start(symbol2){

        while (true){

            console.log("...")
           
            let [BittrexPriceList, HitBTCPriceList, BinancePriceList] = await Promise.all([
                
                
                ConnectToBittrexAPI.populateBittrexPriceList(),
                ConnectToHitBTCAPI.populateHitBTCPriceList(),
                ConnectToBinanceAPI.populateBinancePriceList()
                
            ]);

            // console.log(BittrexPriceList, HitBTCPriceList);

            let unionSymbol = _.intersection(BittrexPriceList.symbol, HitBTCPriceList.symbol, BinancePriceList.symbol);

            console.log("111", unionSymbol)

            // let found = _.findIndex(unionSymbol, (e) => {
            //     return e == symbol2;
            // }, 0);

            // if (found < 0){
            //     this.sleep(5)
            //     return
            // }

            let filteredBittrexPriceList = {
                symbol: [], asks: [], bids: []
            }
            let filteredHitBTCPriceList = {
                symbol: [], asks: [], bids: []
            }
            let filteredBinancePriceList = {
                symbol: [], asks: [], bids: []
            }

            for (var index = 0; index < unionSymbol.length; index++) {
                var symbol = unionSymbol[index]

                let indexBittrex = _.findIndex(BittrexPriceList.symbol, (e) => {
                    return e == symbol;
                }, 0);

                filteredBittrexPriceList.symbol.push(symbol)
                filteredBittrexPriceList.asks.push(BittrexPriceList.BittrexAskPrice[indexBittrex])
                filteredBittrexPriceList.bids.push(BittrexPriceList.BittrexBidPrice[indexBittrex])

                let indexHitBTC = _.findIndex(HitBTCPriceList.symbol, (e) => {
                    return e == symbol;
                }, 0);

                filteredHitBTCPriceList.symbol.push(symbol)
                filteredHitBTCPriceList.asks.push(HitBTCPriceList.HitBTCAskPrice[indexHitBTC])
                filteredHitBTCPriceList.bids.push(HitBTCPriceList.HitBTCBidPrice[indexHitBTC])

                let indexBinance = _.findIndex(BinancePriceList.symbol, (e) => {
                    return e == symbol;
                }, 0);

                filteredBinancePriceList.symbol.push(symbol)
                filteredBinancePriceList.asks.push(BinancePriceList.BinanceAskPrice[indexBinance])
                filteredBinancePriceList.bids.push(BinancePriceList.BinanceBidPrice[indexBinance])

            }

            console.log(filteredBittrexPriceList, filteredHitBTCPriceList, filteredBinancePriceList)

            // let indexBittrex = _.findIndex(BittrexPriceList.symbol, (e) => {
            //     return e == symbol;
            // }, 0);

            // let indexHitBTC = _.findIndex(HitBTCPriceList.symbol, (e) => {
            //     return e == symbol;
            // }, 0);

            // let bittrexAsk = BittrexPriceList.BittrexAskPrice[indexBittrex];
            // let hitbtcAsk = HitBTCPriceList.HitBTCAskPrice[indexHitBTC]

            // let bittrexBid = BittrexPriceList.BittrexBidPrice[indexBittrex];
            // let hitbtcBid = HitBTCPriceList.HitBTCBidPrice[indexHitBTC]

            // let lowestAsk = Math.min(bittrexAsk, hitbtcAsk);
            // let highestBid = Math.max(bittrexBid, hitbtcBid);

            this.sleep(5000)
         }
        
    }

}

module.exports = new Main()

async function start (){
    await module.exports.start()
}

start()

