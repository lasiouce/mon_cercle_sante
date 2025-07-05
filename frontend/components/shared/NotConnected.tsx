import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"

import { AlertCircleIcon } from "lucide-react"

const NotConnected = () => {
  return (
    <Alert>
        <AlertCircleIcon />
        <AlertTitle>Warning!</AlertTitle>
        <AlertDescription>
            Please connect your wallet to continue.
        </AlertDescription>
    </Alert>
  )
}

export default NotConnected