import { ConnectButton } from "@rainbow-me/rainbowkit";

const Header = () => {
    return (
        <header className="p-5 flex justify-between items-center"> 
            <div>
                Logo
            </div>
            <div>
                <ConnectButton />
            </div>
        </header>
    )
}

export default Header;