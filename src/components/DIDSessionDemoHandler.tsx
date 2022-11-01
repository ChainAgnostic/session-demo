import detectEthereumProvider from '@metamask/detect-provider'
import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'
import { DIDSession, createDIDKey, createDIDCacao } from 'did-session'
import { Cacao, SiwsMessage } from 'ceramic-cacao'
import React, { useState } from 'react'
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { Stack, TextField } from '@mui/material'
import { randomBytes, randomString } from '@stablelib/random'
import { toString } from 'uint8arrays/to-string'

const MessageTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#ff4f00',
    },
    '&:hover fieldset': {
      borderColor: '#ff4f00',
    },
  },
});

function DIDSessionDemoHandler() {
  const [session, setSession] = useState<DIDSession>()
  const oneWeek = 60 * 60 * 24 * 7
  const solanaMainNetChainRef = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
  const resources = ['test-resource', 'another-test-resource']
  const domain = 'YourAppName'


  const signInWithEthereum = async () => {
    const ethProvider = await detectEthereumProvider();
    const addresses = await (window.ethereum as any).request({ method: 'eth_requestAccounts' })
    const authProvider = new EthereumAuthProvider(ethProvider, addresses[0])

    const session = await DIDSession.authorize(
      authProvider,
      {
        resources: resources,
        expiresInSecs: oneWeek,
        domain: domain
      })
    setSession(session)
  }

  const signInWithSolana = async () => {
    if ('phantom' in window) {
      const anyWindow: any = window
      const solProvider = anyWindow.phantom?.solana

      if (!solProvider?.isPhantom) {
        window.alert('You need to have the Phantom Wallet installed to log in with Solana')
        return
      }

      await solProvider?.connect()

      const keySeed = randomBytes(32)
      const didKey = await createDIDKey(keySeed)
      const now = Date.now()
      const issuedAt = (new Date(now)).toISOString()
      const expirationTime = (new Date(now + oneWeek * 1000)).toISOString()
      // Just using this message to match the default message we get in signInWithEthereum
      const statement = 'Give this application access to some of your data on Ceramic'

      const siwsMessage = new SiwsMessage({
        domain: domain,
        address: solProvider?.publicKey.toString(),
        statement: statement,
        uri: didKey.id,
        version: '1',
        nonce: randomString(10),
        issuedAt: issuedAt,
        expirationTime: expirationTime,
        chainId: solanaMainNetChainRef,
        resources: resources,
      })

      console.log(solProvider)

      const encodedMessage = new TextEncoder().encode(siwsMessage.toMessage())
      const result = await solProvider?.signMessage(encodedMessage)
      const signature = toString(result.signature, 'base58btc')
      siwsMessage.signature = signature

      const cacao = Cacao.fromSiwsMessage(siwsMessage)
      const did = await createDIDCacao(didKey, cacao)
      const session = new DIDSession({
        keySeed: keySeed,
        cacao: cacao,
        did: did
      })

      setSession(session)
    } else {
      window.alert('You need to have the Phantom Wallet installed to log in with Solana')
    }
  }

  const log = (message: string) => {
    console.log(message)
    const consoleElement = document?.getElementById("console")
    if (consoleElement) {
      consoleElement.innerHTML = message
    }
  }

  const render = () => {
    return (
      <div>
        <div>
          { session === undefined || !session.isAuthorized() ? renderUnauthenticated() : renderAuthenticated() }
        </div>
      </div>
    )
  }

  const renderUnauthenticated = () => {
    return (
      <Stack spacing={2}>
        <Button
          variant="contained"
          size="large"
          onClick={signInWithEthereum}
        >
          Sign In With Ethereum
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={signInWithSolana}
        >
          Sign In With Solana
        </Button>
      </Stack>
    )
  }

  const renderAuthenticated = () => {
    return (
      <Stack spacing={2}>
        <Stack direction='row' justifyContent="center">
          <Button
            variant="contained"
            size="large"
            onClick={ () => {
              log(`${JSON.stringify(session?.cacao, null, 2)}`)
            }}
          >
            Log session's CACAO
          </Button>
        </Stack>
        <Stack direction='row' justifyContent="center">
          <Button
            variant="contained"
            size="large"
            onClick={ () => {
              log(`${session!.serialize()}`)
            }}
          >
            Log serialized session
          </Button>
        </Stack>
        <Stack direction='row' spacing={2} justifyContent="center">
          <MessageTextField
            id="message"
            label="Message"
            variant="outlined"
            sx={{ input: { color: '#ff4f00' } }}
          />
          <Stack justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={ async () => {
                const message = (document?.getElementById("message") as HTMLInputElement).value
                const signed = await session!.did.createJWS(message)
                log(`${signed.signatures[0].signature}`)
              }}
            >
              Log message's signature
            </Button>
          </Stack>
        </Stack>
        <Stack direction='row' justifyContent="center">
          <Button
            variant="contained"
            color="error"
            size="large"
            onClick={ () => {
              setSession(undefined)
            }}
          >
            Sign out
          </Button>
        </Stack>
        <Stack direction='row' justifyContent="left">
          <pre id='console'>

          </pre>
        </Stack>
      </Stack>
    )
  }

  return render()
}

export default DIDSessionDemoHandler
