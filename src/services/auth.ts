import { auth } from "@/services/firebaseConfig"; // Ensure this path is correct
import { signInWithPhoneNumber, ConfirmationResult, signOut, ApplicationVerifier } from "firebase/auth";

class AuthService {
  // ⚠️ Note: The Web SDK requires an 'appVerifier' (reCAPTCHA) to prevent spam.
  // You will pass this in from your login screen!
  async sendOTP(phone: string, appVerifier: ApplicationVerifier) {
    const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
    return confirmation;
  }

  async verifyOTP(
    confirmation: ConfirmationResult,
    code: string
  ) {
    // The confirm method works exactly the same in the Web SDK!
    const credential = await confirmation.confirm(code);

    // Get the JWT token
    const token = await credential.user.getIdToken(true);

    return {
      user: credential.user,
      token,
    };
  }

  async logout() {
    await signOut(auth);
  }
}

export default new AuthService();