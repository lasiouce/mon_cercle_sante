import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";

const Header = () => {
    return (
        <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg border-b-4 border-blue-900">
            <div className="container mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white p-2 rounded-full shadow-md">
                            <Image 
                                src="/logo-cercle.png" 
                                alt="Mon Cercle Santé" 
                                width={50} 
                                height={50}
                                className="cursor-pointer"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wide">
                                Mon Cercle Santé
                            </h1>
                            <p className="text-blue-100 text-sm font-medium">
                                Plateforme de santé connectée
                            </p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1">
                        <ConnectButton />
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header;