class UserData {
  constructor({
    given_name = '',
    family_name = '',
    picture = '',
    email = '',
    email_verified = false,
    identities = [],
    user_metadata = {},
  } = {}) {
    this.given_name = given_name;
    this.family_name = family_name;
    this.picture = picture;
    this.email = email;
    this.email_verified = email_verified;
    this.identities = identities;
    this.user_metadata = user_metadata;
  }

  static fromAuth0User(user) {
    return new UserData({
      given_name: user.given_name,
      family_name: user.family_name,
      picture: user.picture,
      email: user.email,
      email_verified: user.email_verified,
      identities: user.identities,
      user_metadata: user.user_metadata,
    });
  }
}

module.exports = UserData; 