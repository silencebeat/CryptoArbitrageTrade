
const ConnectToBinanceAPI = require("./BinanceAPI")
const ConnectToBittrexAPI = require("./BittrexAPI")
const ConnectToHitBTCAPI = require("./HitBTCAPI")
const nodemailer = require('nodemailer');

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

    async start(){

        // while (true){
           
            const Exchanges = ["Bittrex", "HitBTC"];

            let [BittrexPriceList, HitBTCPriceList] = await Promise.all([
                
                
                ConnectToBittrexAPI.populateBittrexPriceList(),
                ConnectToHitBTCAPI.populateHitBTCPriceList(),
                // ConnectToBinanceAPI.populateBinancePriceList()
                
            ]);

            console.log(BittrexPriceList, HitBTCPriceList)

            // const BittrexPriceList = {
            //     symbol: [],
            //     symbol2: [],
            //     BittrexAskPrice: [],
            //     BittrexBidPrice: [],
            // };

        // }
        
    }

}

module.exports = new Main()

async function start (){
    await module.exports.start()
}

start()

