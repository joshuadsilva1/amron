import auth, {
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";

class AuthService {
  async sendOTP(phone: string) {
    const confirmation = await auth().signInWithPhoneNumber(phone);

    return confirmation;
  }

  async verifyOTP(
    confirmation: FirebaseAuthTypes.ConfirmationResult,
    code: string
  ) {
    const credential = await confirmation.confirm(code);

    const token = await credential.user.getIdToken(true);

    return {
      user: credential.user,
      token,
    };
  }

  async logout() {
    await auth().signOut();
  }
}

export default new AuthService();