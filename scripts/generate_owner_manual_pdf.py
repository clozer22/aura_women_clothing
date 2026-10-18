#!/usr/bin/env python3
"""
AURA WOMEN'S CLOTHING - STORE OWNER USER MANUAL & USER STORIES
Generates an executive, highly-detailed operational PDF manual for the store owner.
Covers storefront journeys, super admin portal, order fulfillment, J&T Express logistics,
thermal waybill printing, staff governance, and security hardening.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' along
    with running headers and footers on every page except the cover.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Suppress headers/footers on cover page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Top Header
        self.drawString(54, 11 * inch - 36, "AURA WOMEN'S CLOTHING  •  STORE OWNER OPERATIONAL MANUAL")
        self.setFont("Helvetica", 8)
        self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "STRICTLY CONFIDENTIAL")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Running Bottom Footer
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.drawString(54, 34, "© 2026 Aura Women's Clothing Atelier. All rights reserved.")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 34, page_str)
        self.restoreState()


def build_pdf(filename="AURA_STORE_OWNER_MANUAL.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=58
    )

    styles = getSampleStyleSheet()

    # Brand Palette
    c_primary = colors.HexColor("#0F172A")    # Deep Slate
    c_rose = colors.HexColor("#9F1239")       # Atelier Burgundy / Rose
    c_amber = colors.HexColor("#B45309")      # Warm Amber
    c_slate = colors.HexColor("#334155")      # Body Slate
    c_light_bg = colors.HexColor("#F8FAFC")   # Box Light Gray
    c_border = colors.HexColor("#E2E8F0")     # Light Border

    # Custom Typography Styles
    title_cover = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=c_primary,
        alignment=0,
        spaceAfter=8
    )
    subtitle_cover = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=c_rose,
        alignment=0,
        spaceAfter=24
    )
    meta_cover = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        alignment=0
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=22,
        textColor=c_primary,
        spaceBefore=16,
        spaceAfter=10,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_rose,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=c_slate,
        spaceAfter=8
    )
    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )
    code_inline = ParagraphStyle(
        'Code_Inline',
        parent=body_style,
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=c_primary
    )
    callout_text = ParagraphStyle(
        'CalloutText',
        parent=body_style,
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#1E293B")
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_slate
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.white
    )

    story = []

    def make_callout(title, text, bg_color="#EFF6FF", border_color="#3B82F6", title_color="#1E40AF"):
        p_title = Paragraph(f"<b>{title}</b>", ParagraphStyle('CallTitle', parent=callout_text, fontName='Helvetica-Bold', textColor=colors.HexColor(title_color), spaceAfter=4))
        p_body = Paragraph(text, callout_text)
        t = Table([[p_title], [p_body]], colWidths=[7.0 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(border_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))
        return t

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("AURA WOMEN'S CLOTHING", ParagraphStyle('CoverBrand', parent=title_cover, fontSize=12, fontName='Helvetica-Bold', textColor=c_rose, spaceAfter=8)))
    story.append(Paragraph("Store Owner Operations Manual<br/>& User Stories Flow Guide", title_cover))
    story.append(Paragraph("Comprehensive End-to-End Operating Procedures: Storefront Checkout, J&T Express Logistics, Payment Gateways, Staff Governance & Cybersecurity Protocols", subtitle_cover))
    story.append(HRFlowable(width="100%", thickness=2, color=c_rose, spaceBefore=0, spaceAfter=24))

    # Executive Metadata Box
    summary_html = """
    This official manual provides the store owner and administrative operations team with a step-by-step
    reference guide to manage every aspect of the Aura Women's Clothing e-commerce enterprise.
    <br/><br/>
    <b>Primary Capabilities Covered:</b><br/>
    • Customer Catalog, Shopping Cart & Multi-Channel Checkout (Card, GCash via Xendit, COD)<br/>
    • Dedicated Super Admin Security Gateway and Role-Based Portal Access<br/>
    • End-to-End Order Fulfillment Pipeline (Pending, To Ship, Shipped, Delivered)<br/>
    • <b>J&T Express Logistics Integration:</b> 1-Click Order Acceptance, Parcel Packaging Customizer (Pouch Sizing & Weights), Rider Dispatch, and Direct Thermal Air Waybill (100x150mm) Printing<br/>
    • Bulk Fulfillment Batch Operations (Bulk Accept, Multi-Label Waybill Printing Queue)<br/>
    • Order Exceptions, Cancellations with Reason Logging, and Automated Inventory Restocking<br/>
    • Staff Governance with Granular Page-Level Permissions and Immutable Audit Trails<br/>
    • Enterprise Cybersecurity Hardening (Row-Level Security, Encrypted Webhooks, API Guardrails)
    """
    story.append(make_callout("EXECUTIVE SYSTEM DIRECTIVE", summary_html, "#FFF1F2", "#F43F5E", "#881337"))
    story.append(Spacer(1, 30))

    meta_table_data = [
        [Paragraph("<b>System Environment:</b>", body_style), Paragraph("Production / Local Staging (Vite + React + Node + Supabase)", body_style)],
        [Paragraph("<b>Logistics Partner:</b>", body_style), Paragraph("J&T Express Philippines (via Shipmates Open API & Native Dispatch)", body_style)],
        [Paragraph("<b>Payment Gateway:</b>", body_style), Paragraph("Xendit Philippines (Cards, GCash e-Wallets, Maya, Cash on Delivery)", body_style)],
        [Paragraph("<b>Security Standard:</b>", body_style), Paragraph("Supabase PostgreSQL Row-Level Security (RLS) + Bearer JWT Auth", body_style)],
        [Paragraph("<b>Thermal Printing:</b>", body_style), Paragraph("Standard 100mm x 150mm (4x6\" A6) Thermal Label Rolls", body_style)],
        [Paragraph("<b>Document Version:</b>", body_style), Paragraph("v2.4.0 • Updated October 2026", body_style)],
    ]
    meta_table = Table(meta_table_data, colWidths=[2.2 * inch, 4.8 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: CREDENTIALS & ACCESS GATEWAYS
    # =========================================================================
    story.append(Paragraph("1. System Roles & Access Credentials", h1_style))
    story.append(Paragraph(
        "Aura Women's Clothing isolates the customer storefront from the administrative governance suite "
        "using dedicated security routing and encrypted session authentication. The credentials configured in "
        "your environment for operational testing and day-to-day administration are detailed below:",
        body_style
    ))

    cred_data = [
        [
            Paragraph("Portal / Role", table_header),
            Paragraph("Access URL", table_header),
            Paragraph("Account Email", table_header),
            Paragraph("Password / Privilege", table_header)
        ],
        [
            Paragraph("<b>Super Admin Portal</b><br/>(Store Governor)", table_cell),
            Paragraph("<code>http://localhost:3000/hq-atelier-gateway-92x</code>", table_cell),
            Paragraph("<code>yzelle@superadmin.com</code>", table_cell),
            Paragraph("<code>yzelle1234</code><br/><i>Full Access to All 6 Tabs</i>", table_cell)
        ],
        [
            Paragraph("<b>Customer Storefront</b><br/>(Shopper Account)", table_cell),
            Paragraph("<code>http://localhost:3000</code>", table_cell),
            Paragraph("<code>markjosephaballe1@gmail.com</code>", table_cell),
            Paragraph("<code>mjaballe2212</code><br/><i>Cart, Orders, Reviews</i>", table_cell)
        ]
    ]
    cred_table = Table(cred_data, colWidths=[1.8 * inch, 2.3 * inch, 1.8 * inch, 1.1 * inch])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0, 2), (-1, 2), colors.white),
    ]))
    story.append(cred_table)
    story.append(Spacer(1, 12))

    story.append(make_callout(
        "SECURITY NOTICE: OBFUSCATED ADMIN GATEWAY",
        "The administrative suite is deliberately hosted at the secret route <b>/hq-atelier-gateway-92x</b> "
        "rather than predictable endpoints like /admin or /login. This prevents automated bot crawlers and brute-force "
        "credential stuffers from discovering the administrative login portal.",
        "#FEF3C7", "#F59E0B", "#92400E"
    ))
    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 2: CUSTOMER STOREFRONT JOURNEY
    # =========================================================================
    story.append(Paragraph("2. Customer Storefront User Story & Flow", h1_style))
    story.append(Paragraph(
        "<b>User Story:</b> <i>As a customer shopping on Aura, I want to seamlessly browse high-end apparel, "
        "select my preferred size and quantity, and complete my order using my preferred payment method "
        "(GCash, Credit Card, or Cash on Delivery) with instant order reference tracking.</i>",
        body_style
    ))

    story.append(Paragraph("<b>Step-by-Step Storefront Checkout Flow:</b>", h2_style))
    steps_customer = [
        "<b>Step 1: Catalog Discovery:</b> The buyer explores collections (Timeless Classics, Casual Chic, Haute Couture). Each garment card displays high-resolution imagery, pricing, and live inventory availability.",
        "<b>Step 2: Size & Specification Selection:</b> On the product detail view, the buyer chooses sizing (XS, S, M, L, XL) and clicks <b>Add to Cart</b>. Real-time stock checks prevent backorders on depleted items.",
        "<b>Step 3: Cart Review:</b> Clicking the bag icon opens the slide-over cart. Customers can adjust quantities, apply promo voucher codes, and inspect itemized subtotals.",
        "<b>Step 4: Shipping Address Input:</b> In checkout, the buyer specifies their recipient name, mobile number (09XXXXXXXXX), and complete Philippine address using the PSGC cascade (Region, Province, City, Barangay, Postal Code).",
        "<b>Step 5: Payment Gateway Selection:</b><br/>"
        "• <b>Xendit Online (Credit/Debit Card, GCash, Maya):</b> Generates a secure hosted invoice with real-time QR code. Once authorized, the webhook verifies payment and transitions order status to <code>PAID</code>.<br/>"
        "• <b>Cash on Delivery (COD):</b> Bypasses gateway pre-authorization, creates order reference in <code>PENDING</code> status, and alerts the atelier for dispatch verification.",
        "<b>Step 6: Instant Confirmation & Invoice Receipt:</b> A dedicated confirmation screen displays the unique Order Reference (e.g., <code>AC-938210</code>), delivery ETA, and a breakdown receipt with tracking links."
    ]
    for s in steps_customer:
        story.append(Paragraph(f"• {s}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 3: ORDER PROCESSING & J&T LOGISTICS
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("3. Order Processing & J&T Express Logistics Workflow", h1_style))
    story.append(Paragraph(
        "Aura's Admin Portal features an integrated logistics suite tailored directly for Philippine courier operations. "
        "The following operational pipeline ensures every customer purchase is verified, packaged according to J&T parcel rules, "
        "and dispatched with official Air Waybill (AWB) thermal stickers.",
        body_style
    ))

    # Visual Table of Pipeline Stages
    pipeline_data = [
        [Paragraph("Pipeline Tab", table_header), Paragraph("Trigger / Condition", table_header), Paragraph("Required Admin Action", table_header)],
        [
            Paragraph("<b>All Orders</b>", table_cell),
            Paragraph("Complete store repository of every transaction.", table_cell),
            Paragraph("Global search by customer, email, reference, or tracking.", table_cell)
        ],
        [
            Paragraph("<b>To Ship</b>", table_cell),
            Paragraph("Orders with confirmed payment (PAID) or accepted COD orders ready for warehouse packing.", table_cell),
            Paragraph("<b>Primary Action:</b> Click <b>Dispatch J&T</b> to configure parcel and book rider.", table_cell)
        ],
        [
            Paragraph("<b>Shipped</b>", table_cell),
            Paragraph("Parcels picked up by J&T rider and in transit through hub distribution sorting.", table_cell),
            Paragraph("Monitor courier milestones and transit checkpoints.", table_cell)
        ],
        [
            Paragraph("<b>To Deliver</b>", table_cell),
            Paragraph("Parcel is out for delivery with the local J&T delivery rider.", table_cell),
            Paragraph("Ensure customer receives SMS/call for doorstep delivery handover.", table_cell)
        ],
        [
            Paragraph("<b>Delivered</b>", table_cell),
            Paragraph("Successful delivery confirmation and COD cash remittance collected.", table_cell),
            Paragraph("Transaction marked as completed in sales analytics.", table_cell)
        ],
        [
            Paragraph("<b>Cancelled / Returned</b>", table_cell),
            Paragraph("Orders aborted due to customer request, out-of-stock, or delivery refusal.", table_cell),
            Paragraph("Inventory automatically returned to stock; reason logged in audit trail.", table_cell)
        ]
    ]
    pipe_table = Table(pipeline_data, colWidths=[1.5 * inch, 2.6 * inch, 2.9 * inch])
    pipe_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_rose),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pipe_table)
    story.append(Spacer(1, 14))

    # Detailed Step-by-Step J&T Express Fulfillment Flow
    story.append(Paragraph("<b>Step-by-Step Store Owner Guide: Fulfilling an Order via J&T Express</b>", h2_style))
    steps_jnt = [
        "<b>Step 1: Accept the Order (for COD & Pending Transactions):</b><br/>"
        "When an order arrives as <code>PENDING</code>, click the green <b>Accept Order</b> button on the order card. This moves the order into <code>TO_SHIP</code> status and logs a timestamped entry in the audit trail. You can also select multiple pending orders and click <b>Accept (N)</b> on the bulk bar.",

        "<b>Step 2: Open the J&T Dispatch Setup Modal:</b><br/>"
        "Click the red <b>Dispatch J&T</b> button on the order card. A customized setup modal appears with the consignee's complete address and parcel configuration options.",

        "<b>Step 3: Select Packaging Pouch Size:</b><br/>"
        "Choose the appropriate J&T packaging standard based on the garments purchased:<br/>"
        "• <i>Small Pouch (Up to 1.0 kg - 17 x 30 cm):</i> Best for 1 to 2 light dresses, tops, or skirts.<br/>"
        "• <i>Medium Pouch (Up to 3.0 kg - 24 x 38 cm):</i> Recommended for 3 to 5 garments or denim sets.<br/>"
        "• <i>Large Pouch (Up to 5.0 kg - 30 x 45 cm):</i> Recommended for bulky outerwear or multi-item purchases.<br/>"
        "• <i>Carton Box (Up to 10.0 kg):</i> Used for large orders or structured fragile designer pieces.",

        "<b>Step 4: Verify Parcel Weight & Rider Delivery Instructions:</b><br/>"
        "Verify the estimated parcel weight (default: 0.35 kg). Add any delivery instructions for the rider (e.g., <i>'Call customer before arriving at gate 2, fragile fabric'</i>).",

        "<b>Step 5: Verify COD Cash Collection Amount:</b><br/>"
        "The modal automatically highlights the COD remittance amount. If COD, the exact total amount (e.g. ₱3,540) is passed to the courier manifest. If prepaid via Card/GCash, the COD amount is strictly locked to ₱0.00.",

        "<b>Step 6: Confirm & Generate Air Waybill (AWB):</b><br/>"
        "Click <b>Confirm & Generate J&T Waybill</b>. The backend dispatches the booking, receives an official tracking number (e.g., <code>JT729104829PH</code>), updates the database, and immediately opens the printable thermal waybill sticker.",

        "<b>Step 7: Thermal Printing:</b><br/>"
        "Click <b>Print Label</b> in the waybill preview. Your thermal printer (Xprinter, Zebra, Phomemo) will print an isolated 100x150mm sticker ready to be peeled and affixed to the J&T pouch."
    ]
    for s in steps_jnt:
        story.append(Paragraph(s, bullet_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 10))

    # =========================================================================
    # SECTION 4: THERMAL PRINTING STANDARD
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("4. J&T Thermal Waybill (100mm x 150mm) Printing Guide", h1_style))
    story.append(Paragraph(
        "Aura implements the official Philippines courier standard for Air Waybills (AWB). "
        "The stickers are engineered specifically for 4x6 inch (100mm x 150mm / A6) direct thermal paper rolls, "
        "guaranteeing crisp barcodes that can be instantly scanned by J&T pickup and sorting facility lasers.",
        body_style
    ))

    waybill_elements = [
        [Paragraph("Waybill Element", table_header), Paragraph("Field Purpose & Placement", table_header)],
        [
            Paragraph("<b>Header & Courier Tag</b>", table_cell),
            Paragraph("Bold J&T Express logo and service classification (Standard Air / Express).", table_cell)
        ],
        [
            Paragraph("<b>Carrier Sorting Station Code</b>", table_cell),
            Paragraph("Large destination routing code (e.g. <code>MNL-MAK-01</code>, <code>CEB-HUB-01</code>, <code>DVO-01</code>) calculated from the delivery city for rapid automated hub sorting.", table_cell)
        ],
        [
            Paragraph("<b>High-Density Barcode</b>", table_cell),
            Paragraph("Standard Code 128 barcode encoding the unique tracking number with human-readable tracking digits.", table_cell)
        ],
        [
            Paragraph("<b>Shipper (From) Box</b>", table_cell),
            Paragraph("Aura Atelier Dispatch Hub, 108 Atelier Blvd, Salcedo Village, Makati City, Metro Manila. Hotline: 09171234567.", table_cell)
        ],
        [
            Paragraph("<b>Consignee (To) Box</b>", table_cell),
            Paragraph("Customer full name, verified mobile contact number, complete street address, barangay, city, province, and postal code.", table_cell)
        ],
        [
            Paragraph("<b>Payment Terms Indicator</b>", table_cell),
            Paragraph("<b>CASH ON DELIVERY: ₱X,XXX</b> (bold highlighted block) OR <b>PREPAID (DO NOT COLLECT CASH)</b>.", table_cell)
        ],
        [
            Paragraph("<b>Parcel Specifications</b>", table_cell),
            Paragraph("Total parcel weight in KG, packaging pouch type, and itemized garment SKU content description.", table_cell)
        ],
        [
            Paragraph("<b>Recipient Signature Block</b>", table_cell),
            Paragraph("Handover sign-off line and delivery date timestamp.", table_cell)
        ]
    ]
    wb_table = Table(waybill_elements, colWidths=[2.2 * inch, 4.8 * inch])
    wb_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(wb_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Bulk Printing Workflow for High-Volume Dispatch Days:</b>", h2_style))
    story.append(Paragraph(
        "On high-volume sale days (e.g., payday sales or collection launches), printing stickers one by one can be time-consuming. "
        "Aura provides a <b>Bulk Thermal Waybill Queue</b>:",
        body_style
    ))
    bulk_steps = [
        "1. Check the selection box on the left of each order in the <b>To Ship</b> tab (or click <b>Select All Displayed</b>).",
        "2. The bulk action bar appears. Click <b>Print (N) Waybills</b>.",
        "3. A batch preview modal opens displaying every selected order's thermal waybill in a continuous queue.",
        "4. Click <b>Print All Labels</b> (or press Ctrl+P / Cmd+P). The CSS printer driver separates each sticker on its own 100x150mm page, printing all stickers continuously on your thermal printer roll!"
    ]
    for b in bulk_steps:
        story.append(Paragraph(b, bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 5: EXCEPTIONS & CANCELLATIONS
    # =========================================================================
    story.append(Paragraph("5. Handling Cancellations, Defective Items & Returns", h1_style))
    story.append(Paragraph(
        "Store owners must occasionally cancel orders due to buyer requests, fabric defects discovered during packing, "
        "or suspicious fraud attempts. Aura features a structured cancellation protocol that protects inventory integrity:",
        body_style
    ))
    cancel_features = [
        "<b>Standard Reason Logging:</b> When clicking <b>Cancel</b> on an order, you select a pre-categorized reason (<i>Customer requested cancellation, Item out of stock / defect identified, Suspected fraudulent order, Incomplete address, Unresponsive buyer</i>) and add optional notes.",
        "<b>Automated Stock Restocking:</b> Cancelling the order automatically marks inventory reservations as available, returning garment units to the live storefront without manual database queries.",
        "<b>Immutable Audit Trail:</b> Every status transition records the exact staff member name, role, email, timestamp, and specific cancellation reason in the order's history log for financial accountability."
    ]
    for c in cancel_features:
        story.append(Paragraph(f"• {c}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # SECTION 6: STAFF GOVERNANCE
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("6. Staff Role Governance & Granular Permissions", h1_style))
    story.append(Paragraph(
        "To allow assistants and fulfillment specialists to process orders without exposing financial metrics, "
        "Aura includes a role-based access control (RBAC) governance tab under <b>Staff Governance</b>.",
        body_style
    ))

    roles_data = [
        [Paragraph("Role Title", table_header), Paragraph("Email Format", table_header), Paragraph("Default Privileges", table_header)],
        [
            Paragraph("<b>Super Administrator</b><br/>(Store Owner)", table_cell),
            Paragraph("<code>name@superadmin.com</code>", table_cell),
            Paragraph("Unrestricted root access to all tabs: Revenue analytics, store customizer, product catalog, staff creation/deletion, and financial logs.", table_cell)
        ],
        [
            Paragraph("<b>Fulfillment Specialist</b><br/>(Staff Admin)", table_cell),
            Paragraph("<code>name@admin.com</code>", table_cell),
            Paragraph("Configurable page permissions (e.g. Orders + Products only). Restricted from viewing owner revenues or creating/deleting other staff.", table_cell)
        ]
    ]
    roles_table = Table(roles_data, colWidths=[2.0 * inch, 2.0 * inch, 3.0 * inch])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Configuring Staff Page Permissions:</b>", h2_style))
    story.append(Paragraph(
        "Super Admins can grant or revoke access on a per-tab basis using the <b>Permissions</b> button on any staff card:<br/>"
        "• <code>dashboard</code>: Executive metrics, revenue stats, visitor trend analytics.<br/>"
        "• <code>products</code>: Inventory creation, pricing, sizing tables, and stock adjustments.<br/>"
        "• <code>orders</code>: Order fulfillment pipeline, J&T booking, waybill printing.<br/>"
        "• <code>reviews</code>: Customer rating moderation and review replies.<br/>"
        "• <code>customize</code>: Hero banners, color schemes, and branding presets.<br/>"
        "• <code>profile</code>: Atelier biographical profile and contact info.",
        body_style
    ))
    story.append(Spacer(1, 12))

    # =========================================================================
    # SECTION 7: CYBERSECURITY HARDENING
    # =========================================================================
    story.append(Paragraph("7. Cybersecurity Hardening & Operating Protocols", h1_style))
    story.append(Paragraph(
        "Aura employs a multi-layered defense architecture protecting both customer privacy and administrative operations "
        "against common web attack vectors (SQL Injection, Cross-Site Scripting, Unauthorized Scraping, and Token Forgery):",
        body_style
    ))

    sec_guidelines = [
        "<b>PostgreSQL Row-Level Security (RLS):</b> All tables in the Supabase database are shielded with strict RLS policies. Unauthenticated anonymous visitors cannot query orders, customer addresses, phone numbers, or staff profiles.",
        "<b>Server-Side Secret Isolation:</b> Highly privileged keys (such as <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>XENDIT_SECRET_KEY</code>, and courier webhook secrets) are never included in the React frontend bundle. All booking and payment verification routes execute strictly in isolated serverless Node environments.",
        "<b>Administrative Bearer Authentication:</b> The staff management endpoint <code>/api/admin-manage-staff</code> requires a valid Supabase JWT Bearer token on every request. Attempting to query or create staff without an active admin session immediately returns <code>401 Unauthorized</code>.",
        "<b>Webhook Signature Handshakes:</b> Xendit and Shipmates webhook endpoints verify callback verification tokens (<code>x-callback-token</code>) before applying status updates to prevent forged payment notifications.",
        "<b>Input Sanitization & Server Price Recalculation:</b> During checkout, item prices and order subtotals are never trusted from the client side; they are verified and recalculated server-side using the live database catalog to eliminate price manipulation attacks."
    ]
    for g in sec_guidelines:
        story.append(Paragraph(f"• {g}", bullet_style))

    story.append(Spacer(1, 20))
    story.append(make_callout(
        "OPERATIONAL BEST PRACTICE FOR STORE OWNERS",
        "1. Never share your <b>@superadmin.com</b> credentials. Create dedicated <b>@admin.com</b> accounts for staff members.<br/>"
        "2. Ensure your thermal label printer is loaded with 100mm x 150mm adhesive roll paper and calibrated before starting high-volume batch prints.<br/>"
        "3. Always verify high-value COD orders via phone call or SMS before clicking 'Accept Order' to minimize delivery refusal rates.",
        "#ECFDF5", "#10B981", "#065F46"
    ))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated Owner Manual PDF at: {filename}")

if __name__ == "__main__":
    output_path = "/Users/mj.aballe/Development/aura-clothing/AURA_STORE_OWNER_MANUAL.pdf"
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    build_pdf(output_path)
