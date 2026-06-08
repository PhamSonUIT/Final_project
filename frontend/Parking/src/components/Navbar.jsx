import React, { useRef, useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import styles from "../css/Home.module.css";

export default function Navbar() {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  const userName = localStorage.getItem("userName");
  
  const navigate = useNavigate();
  const location = useLocation();
  const lastNavigationRef = useRef(0);

  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isVisible, setIsVisible] = useState(true);    
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      
      if (currentScrollY > 50 && currentScrollY > lastScrollY.current) {
        setIsVisible(false);
        setIsMenuOpen(false); 
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const safeNavigate = (path) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 400) return;
    lastNavigationRef.current = now;
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <header className={`${styles.navbar} ${isVisible ? "" : styles.navbarHidden}`}>
      <div className={styles.brand}>
        <Link to="/" className={styles.brandLink}>
          SMART PARKING
        </Link>
      </div>

      <button 
        className={`${styles.mobileNav} ${isMenuOpen ? styles.mobileNavActive : ""}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle navigation"
        type="button"
      >
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
      </button>

      <nav className={`${styles.navItems} ${isMenuOpen ? styles.navItemsOpen : ""}`}>
        <NavLink 
          to="/" 
          end
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
        >
          Trang chủ
        </NavLink>
        
        <NavLink 
          to="/month-ticket" 
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
        >
          Đăng ký tháng
        </NavLink>

        <a href="/#check" className={`${styles.navLink} ${styles.mobileOnlyNavLink}`}>
          Tính tiền gửi xe
        </a>

        {token && (
          <NavLink 
            to="/profile" 
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
          >
            Hồ sơ của tôi
          </NavLink>
        )}

        {token && (userRole === "Admin" || userRole === "Employee") && (
          <>
            <NavLink 
              to="/price-settings" 
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              Điều chỉnh giá
            </NavLink>
            <a href="/#camera-section" className={styles.navLinkHighlight}>
              Hệ thống Camera Vào/Ra
            </a>
          </>
        )}

        {token && userRole === "Admin" && (
          <NavLink 
            to="/create-account" 
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
          >
            Cấp tài khoản
          </NavLink>
        )}

        {token && userRole === "Admin" && (
          <NavLink 
            to="/admin-dashboard" 
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
          >
            Dashboard
          </NavLink>
        )}

        <div className={styles.mobileAuthActions}>
          {token ? (
            <>
              <div className={styles.userBadgeMobile}>
                Xin chào, <strong>{userName}</strong>
                <span className={styles.roleBadge}>{userRole}</span>
              </div>
              <button type="button" className={`${styles.button} ${styles.dangerButton}`} onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <div className={styles.mobileAuthButtons}>
              <button type="button" className={`${styles.button} ${styles.outlineButton}`} onClick={() => safeNavigate("/signin")}>
                Đăng nhập
              </button>
              <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={() => safeNavigate("/signup")}>
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className={styles.desktopAuthActions}>
        {token ? (
          <>
            <div className={styles.userBadge}>
              Xin chào, <strong>{userName}</strong>
              <span className={styles.roleBadge}>{userRole}</span>
            </div>
            <button type="button" className={`${styles.button} ${styles.dangerButton}`} onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <button type="button" className={`${styles.button} ${styles.outlineButton}`} onClick={() => safeNavigate("/signin")}>
              Đăng nhập
            </button>
            <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={() => safeNavigate("/signup")}>
              Đăng ký
            </button>
          </>
        )}
      </div>
    </header>
  );
}