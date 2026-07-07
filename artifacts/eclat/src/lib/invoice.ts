// src/lib/invoice.ts
import { Order } from './types';

export function printInvoice(order: Order) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const date = order.createdAt
    ? new Date((order.createdAt as any).seconds * 1000).toLocaleDateString()
    : new Date().toLocaleDateString();

  const html = `
    <html>
      <head>
        <title>Invoice - ${order.orderId}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #B47A67; padding-bottom: 20px; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #8E5E4F; }
          .invoice-title { font-size: 24px; color: #B47A67; text-transform: uppercase; }
          .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-box h3 { font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background: #F7F1EE; color: #8E5E4F; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-row.grand { border-top: 2px solid #B47A67; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; color: #8E5E4F; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">THEALANKAR</div>
          <div class="invoice-title">Tax Invoice</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Bill To</h3>
            <p><strong>${order.customerName}</strong></p>
            <p>${order.address}</p>
            <p>${order.city}, ${order.state} - ${order.pincode}</p>
            <p>Phone: ${order.phone}</p>
            <p>Email: ${order.email}</p>
          </div>
          <div class="info-box" style="text-align: right;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>
                  <div><strong>${item.name}</strong></div>
                  <div style="font-size: 11px; color: #666;">Size: ${item.size}${item.color ? ` | Color: ${item.color}` : ''}</div>
                </td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.price.toLocaleString()}</td>
                <td style="text-align: right;">₹${(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₹${order.subtotal.toLocaleString()}</span>
          </div>
          ${order.discount ? `
            <div class="total-row" style="color: green;">
              <span>Discount</span>
              <span>-₹${order.discount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>Shipping</span>
            <span>${order.shipping === 0 ? 'FREE' : `₹${order.shipping.toLocaleString()}`}</span>
          </div>
          <div class="total-row grand">
            <span>Amount Paid</span>
            <span>₹${order.total.toLocaleString()}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping with Thealankar. We appreciate your business!</p>
          <p>This is a computer generated invoice and does not require a physical signature.</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
