import React from 'react';

const Footer = () => {
  return (
    <div className="footer-section">
      <div className="footer">
        <div className="footer-links">
          {['Company', 'Communities', 'Useful links'].map((heading, index) => (
            <div className="footer-column" key={index}>
              <div>{heading}</div>
              <ul className="col-links">
                {index === 0 && (
                  <>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Jobs</a></li>
                    <li><a href="#">For the Record</a></li>
                  </>
                )}
                {index === 1 && (
                  <>
                    <li><a href="#">For Artists</a></li>
                    <li><a href="#">Developers</a></li>
                    <li><a href="#">Advertising</a></li>
                    <li><a href="#">Investors</a></li>
                    <li><a href="#">Vendors</a></li>
                  </>
                )}
                {index === 2 && (
                  <>
                    <li><a href="#">Support</a></li>
                    <li><a href="#">Free Mobile App</a></li>
                  </>
                )}
              </ul>
            </div>
          ))}
          <div className="social-links">
            <i className="fa-brands fa-facebook"></i>
            <i className="fa-brands fa-twitter"></i>
            <i className="fa-brands fa-square-instagram"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
