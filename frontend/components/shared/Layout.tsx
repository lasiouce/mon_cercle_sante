import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow p-5">
            {children}
        </main>
        <Footer />
    </div>
  )
}

export default Layout