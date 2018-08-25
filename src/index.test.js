const { config } = require('serverless-authentication')
const nock = require('nock')
const authentication = require('./index.js')

describe('Facebook authentication', () => {
  beforeAll(() => {
    process.env.PROVIDER_FACEBOOK_ID = 'fb-mock-id'
    process.env.PROVIDER_FACEBOOK_SECRET = 'fb-mock-secret'
    process.env.REDIRECT_CLIENT_URI = 'http://localhost:3000/auth/{provider}/'
    process.env.REDIRECT_URI =
      'https://api-id.execute-api.eu-west-1.amazonaws.com/dev/callback/{provider}'
    process.env.TOKEN_SECRET = 'token-secret-123'
  })

  describe('Signin', () => {
    it('should signin without params', async () => {
      const providerConfig = config({ provider: 'facebook' })
      const data = await authentication.signinHandler(providerConfig)
      expect(data.url).toBe(
        'https://www.facebook.com/dialog/oauth?client_id=fb-mock-id&redirect_uri=https://api-id.execute-api.eu-west-1.amazonaws.com/dev/callback/facebook'
      )
    })

    it('should signin with scope and state params', async () => {
      const providerConfig = config({ provider: 'facebook' })
      const data = await authentication.signinHandler(providerConfig, {
        scope: 'email',
        state: '123456'
      })
      expect(data.url).toBe(
        'https://www.facebook.com/dialog/oauth?client_id=fb-mock-id&redirect_uri=https://api-id.execute-api.eu-west-1.amazonaws.com/dev/callback/facebook&scope=email&state=123456'
      )
    })
  })

  describe('Callback', () => {
    beforeAll(() => {
      const providerConfig = config({ provider: 'facebook' })
      nock('https://graph.facebook.com')
        .get('/v2.3/oauth/access_token')
        .query({
          client_id: providerConfig.id,
          redirect_uri: providerConfig.redirect_uri,
          client_secret: providerConfig.secret,
          code: 'code'
        })
        .reply(200, {
          access_token: 'access-token-123'
        })

      nock('https://graph.facebook.com')
        .get('/me')
        .query({
          access_token: 'access-token-123',
          fields: 'id,name,picture,email'
        })
        .reply(200, {
          id: 'user-id-1',
          name: 'Eetu Tuomala',
          email: 'email@test.com',
          picture: {
            data: {
              is_silhouette: false,
              url: 'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460'
            }
          }
        })
    })

    it('should return profile', async () => {
      const providerConfig = config({ provider: 'facebook' })
      const profile = await authentication.callbackHandler(
        { code: 'code', state: 'state' },
        providerConfig
      )
      expect(profile.id).toBe('user-id-1')
      expect(profile.name).toBe('Eetu Tuomala')
      expect(profile.email).toBe('email@test.com')
      expect(profile.picture).toBe(
        'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460'
      )
      expect(profile.provider).toBe('facebook')
      expect(profile.at_hash).toBe('access-token-123')
    })
  })
})
