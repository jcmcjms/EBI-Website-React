import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Enterprise Bank Philippines</h3>
            <p className="text-sm text-muted-foreground">
              Your trusted partner for banking services since 1990.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-foreground">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>12th Floor, Enterprise Tower</li>
              <li>Ayala Avenue, Makati City</li>
              <li>Metro Manila, Philippines</li>
              <li>Tel: (02) 8888-8888</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Enterprise Bank Philippines. All rights reserved.</p>
          <p className="mt-2 text-xs">
            PDIC Insured. Deposits are insured by the Philippine Deposit Insurance Corporation up to ₱500,000.
          </p>
        </div>
      </div>
    </footer>
  );
}
