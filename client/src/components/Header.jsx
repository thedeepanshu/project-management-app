import { Link } from "react-router-dom";
import logo from "./assets/logo.png";

export default function Header() {
  return (
    <nav className="navbar bg-light mb-5 py-2 px-0">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <div className="d-flex">
            <img src={logo} alt="Graphql Logo" className="mr-2" />
            <div>P-M-A</div>
          </div>
        </Link>
      </div>
    </nav>
  );
}
