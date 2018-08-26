import { Profile, Provider } from 'serverless-authentication'

function mapProfile(response) {
  const overwrites = {
    picture:
      response.picture &&
      response.picture.data &&
      !response.picture.data.is_silhouette
        ? response.picture.data.url
        : null,
    provider: 'facebook'
  }

  return new Profile(Object.assign(response, overwrites))
}

class FacebookProvider extends Provider {
  signinHandler({ scope, state } = {}) {
    const options = Object.assign(
      { scope, state },
      { signin_uri: 'https://www.facebook.com/dialog/oauth' }
    )
    return super.signin(options)
  }

  callbackHandler(event) {
    const options = {
      authorization_uri: 'https://graph.facebook.com/v2.3/oauth/access_token',
      profile_uri: 'https://graph.facebook.com/me',
      profileMap: mapProfile,
      authorizationMethod: 'GET'
    }

    return super.callback(event, options, {
      profile: { fields: 'id,name,picture,email' }
    })
  }
}

const signinHandler = (config, options) =>
  new FacebookProvider(config).signinHandler(options)

const callbackHandler = (event, config) =>
  new FacebookProvider(config).callbackHandler(event)

exports.signinHandler = signinHandler
exports.callbackHandler = callbackHandler
