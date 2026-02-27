'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomsDeclarationPage() {
  const { id: shipmentId, declId } = useParams();
  const [declaration, setDeclaration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchDeclaration();
  }, [shipmentId, declId]);

  const fetchDeclaration = async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/customs-declaration`);
      if (res.ok) {
        const data = await res.json();
        const decl = Array.isArray(data) ? data.find(d => d.id === declId) : data;
        if (decl) {
          setDeclaration(decl);
          setFormData(decl);
        }
      }
    } catch (err) {
      console.error('Failed to fetch declaration', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const items = [...(formData.lineItems || [])];
    items[index] = { ...items[index], [field]: value };
    setFormData(prev => ({ ...prev, lineItems: items }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/customs-declaration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declarationId: declId, ...formData }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeclaration(updated);
        setFormData(updated);
        setIsEditing(false);
        alert('Declaration saved successfully');
      } else {
        alert('Failed to save declaration');
      }
    } catch (err) {
      console.error('Error saving declaration', err);
      alert('Error saving declaration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!declaration) return <div className="text-center py-20 text-red-500">Declaration not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/dashboard/shipments/${shipmentId}`} className="text-sm text-blue-600 mb-2 inline-block">← Back to Shipment</Link>
          <h1 className="text-2xl font-bold">中华人民共和国海关出口货物报关单</h1>
          <p className="text-gray-500 text-sm">Declaration No: {declaration.declarationNo || '—'}</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setFormData(declaration); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-primary">Edit</button>
          )}
        </div>
      </div>

      {/* Header Section */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Row 1 */}
          <div className="col-span-2 pb-4 border-b border-gray-200">
            <label className="label-field">预录入编号 (Pre-entry No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.declarationNo || ''}
              onChange={e => handleFieldChange('declarationNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">海关编号 (Customs No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.customsNo || ''}
              onChange={e => handleFieldChange('customsNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Row 2 */}
          <div>
            <label className="label-field">收发货人 (Consignor)</label>
            <input
              type="text"
              className="input-field w-full"
              value={`${formData.consignorName || ''} (${formData.consignorCode || ''})`}
              disabled
              placeholder="Name (Code)"
            />
          </div>

          <div>
            <label className="label-field">出口口岸 (Export Port)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.exportPort || ''}
              onChange={e => handleFieldChange('exportPort', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">出口日期 (Export Date)</label>
            <input
              type="date"
              className="input-field w-full"
              value={formData.exportDate ? new Date(formData.exportDate).toISOString().split('T')[0] : ''}
              onChange={e => handleFieldChange('exportDate', e.target.value || null)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">申报日期 (Declaration Date)</label>
            <input
              type="date"
              className="input-field w-full"
              value={formData.declarationDate ? new Date(formData.declarationDate).toISOString().split('T')[0] : ''}
              onChange={e => handleFieldChange('declarationDate', e.target.value || null)}
              disabled={!isEditing}
            />
          </div>

          {/* Row 3 */}
          <div>
            <label className="label-field">生产销售单位 (Production Unit)</label>
            <input
              type="text"
              className="input-field w-full"
              value={`${formData.productionUnit || ''} (${formData.productionUnitCode || ''})`}
              disabled
              placeholder="Unit (Code)"
            />
          </div>

          <div>
            <label className="label-field">运输方式 (Transport Method)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.transportMethod || ''}
              onChange={e => handleFieldChange('transportMethod', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. 海运 (Sea)"
            />
          </div>

          <div>
            <label className="label-field">运输工具名称 (Transport Name)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.transportName || ''}
              onChange={e => handleFieldChange('transportName', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">提运单号 (B/L Number)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.blNumber || ''}
              onChange={e => handleFieldChange('blNumber', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Row 4 */}
          <div>
            <label className="label-field">申报单位 (Declaring Unit)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.declaringUnit || ''}
              onChange={e => handleFieldChange('declaringUnit', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">监管方式 (Supervision Mode)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.supervisionMode || ''}
              onChange={e => handleFieldChange('supervisionMode', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">征免性质 (Tax Exemption)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.taxExemption || ''}
              onChange={e => handleFieldChange('taxExemption', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">备案号 (Record No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.recordNo || ''}
              onChange={e => handleFieldChange('recordNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Row 5 */}
          <div>
            <label className="label-field">贸易国（地区）(Trade Country)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.tradeCountry || ''}
              onChange={e => handleFieldChange('tradeCountry', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">运抵国（地区）(Destination Country)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.destinationCountry || ''}
              onChange={e => handleFieldChange('destinationCountry', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">指运港 (Destination Port)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.destinationPort || ''}
              onChange={e => handleFieldChange('destinationPort', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">境内货源地 (Domestic Source)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.domesticSource || ''}
              onChange={e => handleFieldChange('domesticSource', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {/* Row 6 */}
          <div>
            <label className="label-field">许可证号 (License No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.licenseNo || ''}
              onChange={e => handleFieldChange('licenseNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">成交方式 (Transaction Method)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.transactionMethod || ''}
              onChange={e => handleFieldChange('transactionMethod', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">运费 (Freight Cost)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.freightCost || ''}
              onChange={e => handleFieldChange('freightCost', e.target.value || null)}
              disabled={!isEditing}
              step="0.01"
            />
          </div>

          <div>
            <label className="label-field">保费 (Insurance Cost)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.insuranceCost || ''}
              onChange={e => handleFieldChange('insuranceCost', e.target.value || null)}
              disabled={!isEditing}
              step="0.01"
            />
          </div>

          <div>
            <label className="label-field">杂费 (Misc Cost)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.miscCost || ''}
              onChange={e => handleFieldChange('miscCost', e.target.value || null)}
              disabled={!isEditing}
              step="0.01"
            />
          </div>

          {/* Row 7 */}
          <div>
            <label className="label-field">合同协议号 (Contract No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.contractNo || ''}
              onChange={e => handleFieldChange('contractNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">件数 (Total Packages)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.totalPackages || ''}
              onChange={e => handleFieldChange('totalPackages', e.target.value || null)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">包装种类 (Package Type)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.packageType || ''}
              onChange={e => handleFieldChange('packageType', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="label-field">毛重（公斤）(Gross Weight Kg)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.grossWeightKg || ''}
              onChange={e => handleFieldChange('grossWeightKg', e.target.value || null)}
              disabled={!isEditing}
              step="0.01"
            />
          </div>

          <div>
            <label className="label-field">净重（公斤）(Net Weight Kg)</label>
            <input
              type="number"
              className="input-field w-full"
              value={formData.netWeightKg || ''}
              onChange={e => handleFieldChange('netWeightKg', e.target.value || null)}
              disabled={!isEditing}
              step="0.01"
            />
          </div>

          {/* Row 8 */}
          <div className="col-span-2">
            <label className="label-field">集装箱号 (Container No)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.containerNo || ''}
              onChange={e => handleFieldChange('containerNo', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-span-2">
            <label className="label-field">随附单据 (Attached Docs)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.attachedDocs || ''}
              onChange={e => handleFieldChange('attachedDocs', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g. Invoice, Packing List, etc."
            />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">商品信息 (Line Items)</h2>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>项号</th>
                <th>商品编号</th>
                <th>商品名称、规格型号</th>
                <th>数量及单位</th>
                <th>最终目的国</th>
                <th>单价</th>
                <th>总价</th>
                <th>币制</th>
                <th>征免</th>
              </tr>
            </thead>
            <tbody>
              {(formData.lineItems || []).map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="number"
                      className="input-field w-full text-sm"
                      value={item.itemNo || ''}
                      onChange={e => handleLineItemChange(idx, 'itemNo', e.target.value || null)}
                      disabled={!isEditing}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={item.hsCode || ''}
                      onChange={e => handleLineItemChange(idx, 'hsCode', e.target.value)}
                      disabled={!isEditing}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={item.description || ''}
                      onChange={e => handleLineItemChange(idx, 'description', e.target.value)}
                      disabled={!isEditing}
                    />
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        className="input-field flex-1 text-sm"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={e => handleLineItemChange(idx, 'quantity', e.target.value || null)}
                        disabled={!isEditing}
                      />
                      <input
                        type="text"
                        className="input-field w-16 text-sm"
                        placeholder="Unit"
                        value={item.unit || ''}
                        onChange={e => handleLineItemChange(idx, 'unit', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={item.destinationCountry || ''}
                      onChange={e => handleLineItemChange(idx, 'destinationCountry', e.target.value)}
                      disabled={!isEditing}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input-field w-full text-sm"
                      value={item.unitPrice || ''}
                      onChange={e => handleLineItemChange(idx, 'unitPrice', e.target.value || null)}
                      disabled={!isEditing}
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input-field w-full text-sm"
                      value={item.totalPrice || ''}
                      onChange={e => handleLineItemChange(idx, 'totalPrice', e.target.value || null)}
                      disabled={!isEditing}
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={item.currency || ''}
                      onChange={e => handleLineItemChange(idx, 'currency', e.target.value)}
                      disabled={!isEditing}
                      placeholder="e.g. USD"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input-field w-full text-sm"
                      value={item.taxType || ''}
                      onChange={e => handleLineItemChange(idx, 'taxType', e.target.value)}
                      disabled={!isEditing}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!formData.lineItems || formData.lineItems.length === 0) && (
          <p className="text-sm text-gray-400 mt-3">No line items</p>
        )}
      </div>

      {/* Footer Section */}
      <div className="card">
        <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-200">
          <div>
            <label className="label-field">特殊关系确认 (Special Relationship)</label>
            <select
              className="select-field w-full"
              value={formData.specialRelationship ? 'yes' : 'no'}
              onChange={e => handleFieldChange('specialRelationship', e.target.value === 'yes')}
              disabled={!isEditing}
            >
              <option value="no">否 (No)</option>
              <option value="yes">是 (Yes)</option>
            </select>
          </div>
          <div>
            <label className="label-field">价格影响确认 (Price Impact)</label>
            <select
              className="select-field w-full"
              value={formData.priceImpact ? 'yes' : 'no'}
              onChange={e => handleFieldChange('priceImpact', e.target.value === 'yes')}
              disabled={!isEditing}
            >
              <option value="no">否 (No)</option>
              <option value="yes">是 (Yes)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-field">支付特许权使用费确认 (Royalty Payment)</label>
            <select
              className="select-field w-full"
              value={formData.royaltyPayment ? 'yes' : 'no'}
              onChange={e => handleFieldChange('royaltyPayment', e.target.value === 'yes')}
              disabled={!isEditing}
            >
              <option value="no">否 (No)</option>
              <option value="yes">是 (Yes)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="label-field">录入员 (Declarant Name)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.declarantName || ''}
              onChange={e => handleFieldChange('declarantName', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="label-field">录入单位 (Declaring Unit)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.declaringUnit || ''}
              onChange={e => handleFieldChange('declaringUnit', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="label-field">报关人员 (Customs Broker)</label>
            <input
              type="text"
              className="input-field w-full"
              value={formData.declarantName || ''}
              onChange={e => handleFieldChange('declarantName', e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="label-field">联系电话 (Phone)</label>
            <input
              type="tel"
              className="input-field w-full"
              value={formData.declarantPhone || ''}
              onChange={e => handleFieldChange('declarantPhone', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 italic">申报单位（签章）</p>
          <p className="text-sm text-gray-400 mt-2">Declaring Unit (Signature & Seal)</p>
        </div>
      </div>
    </div>
  );
}
