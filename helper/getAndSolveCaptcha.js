import solveCaptcha from "./captchaSolver.js";
import axios from "axios";

export default async function getAndSolveCaptcha() {
	const res = await axios.get(
		"https://gateway-voters.eci.gov.in/api/v1/captcha-service/generateCaptcha/EROLL"
	);

	// Base64 text
	const imageBase64 = res.data.captcha;
	const captchaId = res.data.id;

	const captchaText = solveCaptcha(imageBase64);

	return {
		captchaText,
		captchaId,
	};
}
