package com.ems.controller;

import com.ems.util.TimeUtil;
import com.ems.model.*;
import com.ems.service.InventoryService;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
@RestController @RequestMapping("/api/admin/inventory") 
public class InventoryController {
 private final InventoryService s; 
 public InventoryController(InventoryService s){
    this.s=s;
}
 @GetMapping("/dashboard") 
 public Map<String,Object> dashboard(){
    return s.dashboard();
} 
@GetMapping("/analytics") 
public Map<String,Object> analytics(){
    return s.analytics();
} 
@GetMapping("/audit-logs") 
public List<AuditLog> auditLogs(){
    return s.auditLogs();
}
 @GetMapping("/categories") 
 public List<InventoryCategory> categories(){
    return s.categories();
}
 @PostMapping("/categories") 
 public InventoryCategory addCategory(@RequestBody Map<String,String>b){
    return s.createCategory(b);
}
 @PutMapping("/categories/{id}") 
 public InventoryCategory updateCategory(@PathVariable Long id,@RequestBody Map<String,String>b){
    return s.updateCategory(id,b);
}
 @DeleteMapping("/categories/{id}") 
 public Map<String,String> deleteCategory(@PathVariable Long id){
    s.deleteCategory(id);
    return Map.of("message","Category deleted");
}
 @GetMapping("/components") 
 public List<Component> components(){
    return s.components();
}
 @PostMapping("/components") 
 public Component addComponent(@RequestBody Map<String,Object>b){
    return s.createComponent(b);
}
 @PutMapping("/components/{id}") 
 public Component updateComponent(@PathVariable Long id,@RequestBody Map<String,Object>b){
    return s.updateComponent(id,b);
}
 @DeleteMapping("/components/{id}") 
 public Map<String,String> deleteComponent(@PathVariable Long id){
    s.deleteComponent(id);
    return Map.of("message","Component deleted");
}
 @PostMapping("/components/{id}/stock") 
 public StockTransaction stock(@PathVariable Long id,@RequestBody Map<String,Object>b,Authentication a){
    return s.stock(id,b,a.getName());
}
 @GetMapping("/transactions") 
 public List<StockTransaction> transactions(){
    return s.transactions();
}
 @GetMapping(value="/reports/components/csv",produces="text/csv") 
 public ResponseEntity<String> componentsCsv(){
    StringBuilder x=new StringBuilder("Code,Name,Category,Manufacturer,Current Quantity,Minimum Quantity,Unit,Location\n");
    for(Component c:s.components())x.append(row(c.getComponentCode(),c.getName(),c.getCategory()==null?"":c.getCategory().getName(),c.getManufacturer(),c.getCurrentQuantity(),c.getMinimumQuantity(),c.getUnit(),c.getStorageLocation()));
    return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=components-report.csv").body(x.toString());
}
 @GetMapping(value="/reports/transactions/csv",produces="text/csv") 
 public ResponseEntity<String> transactionsCsv(){
    StringBuilder x=new StringBuilder("Date,Component,Type,Quantity,Purpose,Created By\n");
    for(StockTransaction t:s.transactions())x.append(row(t.getTransactionDate(),t.getComponent()==null?"":t.getComponent().getName(),t.getTransactionType(),t.getQuantity(),t.getPurpose(),t.getCreatedBy()));
    return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=transactions-report.csv").body(x.toString());
}
 @GetMapping(value="/reports/inventory/pdf",produces=MediaType.APPLICATION_PDF_VALUE) public void pdf(HttpServletResponse r)throws Exception{r.setHeader("Content-Disposition","attachment; filename=inventory-report.pdf");Document d=new Document(PageSize.A4.rotate());PdfWriter.getInstance(d,r.getOutputStream());d.open();d.add(new Paragraph("INVENTORY MANAGEMENT REPORT",FontFactory.getFont(FontFactory.HELVETICA_BOLD,18)));d.add(new Paragraph("Generated: "+TimeUtil.now()));d.add(Chunk.NEWLINE);PdfPTable t=new PdfPTable(6);for(String h:new String[]{"Code","Component","Category","Current","Minimum","Status"})t.addCell(new PdfPCell(new Phrase(h)));for(Component c:s.components()){t.addCell(c.getComponentCode()==null?"":c.getComponentCode());t.addCell(c.getName()==null?"":c.getName());t.addCell(c.getCategory()==null?"":c.getCategory().getName());t.addCell(String.valueOf(c.getCurrentQuantity()==null?0:c.getCurrentQuantity()));t.addCell(String.valueOf(c.getMinimumQuantity()==null?0:c.getMinimumQuantity()));int cur=c.getCurrentQuantity()==null?0:c.getCurrentQuantity();int min=c.getMinimumQuantity()==null?0:c.getMinimumQuantity();t.addCell(cur<=min?"LOW STOCK":"OK");}d.add(t);d.close();}
 private String row(Object...v){StringBuilder b=new StringBuilder();for(int i=0;i<v.length;i++){if(i>0)b.append(',');String z=v[i]==null?"":String.valueOf(v[i]).replace("\"","\"\"");b.append('"').append(z).append('"');}return b.append('\n').toString();}
}

