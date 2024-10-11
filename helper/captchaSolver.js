import { config } from "dotenv"
config()
import TwoCaptcha from "@2captcha/captcha-solver"

const apiKey = process.env.TWO_CAPTCHA_API_KEY
console.log(apiKey);


const pollingInterval = 120

const solver = new TwoCaptcha.Solver(apiKey, pollingInterval)

export default async function solveCaptcha(imageBase64) {
  return solver.imageCaptcha({
    body: imageBase64,
    numeric: 4,
    min_len: 6,
    max_len: 6
  })
  .then((res) => {
    // Logs the image text
    console.log(res);
    return res
  })
  .catch((err) => {
    console.log(err);
  })
}