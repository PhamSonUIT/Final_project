import React from 'react';

const CustomerView = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px' }}>
      <h2 style={{ color: '#0d47a1' }}>👋 CHÀO MỪNG KHÁCH HÀNG</h2>
      <p>Tại đây bạn có thể xem trạng thái bãi xe real-time và đăng ký vé tháng.</p>
      
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <div style={styles.slotGreen}>Slot A01: Trống</div>
        <div style={styles.slotRed}>Slot A02: Đầy</div>
        <div style={styles.slotGreen}>Slot B01: Trống</div>
      </div>
    </div>
  );
};

const styles = {
  slotGreen: { padding: '20px', backgroundColor: '#2ecc71', color: 'white', fontWeight: 'bold', borderRadius: '5px' },
  slotRed: { padding: '20px', backgroundColor: '#e74c3c', color: 'white', fontWeight: 'bold', borderRadius: '5px' }
};

export default CustomerView;