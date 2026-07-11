function s(t){const i=window.open("","_blank");if(!i)return;const n=t.createdAt?new Date(t.createdAt.seconds*1e3).toLocaleDateString():new Date().toLocaleDateString(),e=[t.city,t.district,t.state].filter(Boolean).join(", "),a=`
    <html>
      <head>
        <title>Invoice - ${t.orderId}</title>
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
            <p><strong>${t.customerName}</strong></p>
            <p>${t.address}</p>
            <p>${e} - ${t.pincode}</p>
            <p>Phone: ${t.phone}</p>
            <p>Email: ${t.email}</p>
          </div>
          <div class="info-box" style="text-align: right;">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> ${t.orderId}</p>
            <p><strong>Date:</strong> ${n}</p>
            <p><strong>Payment Method:</strong> ${t.paymentMethod}</p>
            <p><strong>Status:</strong> ${t.orderStatus}</p>
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
            ${t.items.map(o=>`
              <tr>
                <td>
                  <div><strong>${o.name}</strong></div>
                  <div style="font-size: 11px; color: #666;">Size: ${o.size}${o.color?` | Color: ${o.color}`:""}</div>
                </td>
                <td style="text-align: center;">${o.quantity}</td>
                <td style="text-align: right;">₹${o.price.toLocaleString()}</td>
                <td style="text-align: right;">₹${(o.price*o.quantity).toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₹${t.subtotal.toLocaleString()}</span>
          </div>
          ${t.discount?`
            <div class="total-row" style="color: green;">
              <span>Discount</span>
              <span>-₹${t.discount.toLocaleString()}</span>
            </div>
          `:""}
          <div class="total-row">
            <span>Shipping</span>
            <span>${t.shipping===0?"FREE":`₹${t.shipping.toLocaleString()}`}</span>
          </div>
          <div class="total-row grand">
            <span>Amount Paid</span>
            <span>₹${t.total.toLocaleString()}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping with Thealankar. We appreciate your business!</p>
          <p>This is a computer generated invoice and does not require a physical signature.</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
    </html>
  `;i.document.write(a),i.document.close()}export{s as p};
