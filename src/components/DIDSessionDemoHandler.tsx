import detectEthereumProvider from '@metamask/detect-provider'
import { DIDSession,  } from 'did-session'
import React, { useState } from 'react'
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { Stack, TextField } from '@mui/material'
import { SolanaWebAuth, getAccountIdByNetwork } from '@didtools/pkh-solana'
import { EthereumWebAuth, getAccountId } from '@didtools/pkh-ethereum'

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
  const resources = ['test-resource', 'another-test-resource']


  const signInWithEthereum = async () => {
    const ethProvider = await detectEthereumProvider();
    const addresses = await (ethProvider as any).request({ method: 'eth_requestAccounts'})
    const accountId = await getAccountId(ethProvider, addresses[0])

    const authMethod = await EthereumWebAuth.getAuthMethod(ethProvider, accountId)

    const session = await DIDSession.authorize(authMethod, { resources })
    setSession(session)
  }

  const signInWithSolana = async () => {
    if ('phantom' in window) {
      const anyWindow: any = window
      const solProvider = anyWindow.phantom?.solana

      if (!solProvider.isPhantom) {
        window.alert('You need to have the Phantom Wallet installed to log in with Solana')
        return
      }

      const address = await solProvider.connect()
      const accountId = getAccountIdByNetwork('mainnet', address.publicKey.toString())

      const authMethod = await SolanaWebAuth.getAuthMethod(solProvider, accountId)

      // @ts-ignore
      const session = await DIDSession.authorize(authMethod, { resources })

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
