package com.ems.service;

import com.ems.model.*;
import com.ems.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventoryService {
    private final InventoryCategoryRepository categories;
    private final ComponentRepository components;
    private final StockTransactionRepository transactions;
    private final AuditLogRepository audit;
    private final SystemSettingsService settings;

    public InventoryService(InventoryCategoryRepository a, ComponentRepository b, StockTransactionRepository c, AuditLogRepository d, SystemSettingsService s){
        categories=a; components=b; transactions=c; audit=d; settings=s;
    }

    @Transactional(readOnly = true)
    public List<InventoryCategory> categories(){return categories.findAllByOrderByNameAsc();}

    @Transactional
    public InventoryCategory createCategory(Map<String,String> b){
        String n=req(b.get("name"),"Category name");
        if(categories.existsByNameIgnoreCase(n)) throw new IllegalArgumentException("Category already exists");
        InventoryCategory c=new InventoryCategory(); c.setName(n); c.setDescription(b.get("description"));
        InventoryCategory saved=categories.save(c); log("CREATE_CATEGORY","Created category "+n,"system"); return saved;
    }

    @Transactional
    public InventoryCategory updateCategory(Long id,Map<String,String>b){
        InventoryCategory c=categories.findById(id).orElseThrow(()->new IllegalArgumentException("Category not found"));
        String n=req(b.get("name"),"Category name");
        if(!c.getName().equalsIgnoreCase(n)&&categories.existsByNameIgnoreCase(n)) throw new IllegalArgumentException("Category already exists");
        c.setName(n); c.setDescription(b.get("description")); return categories.save(c);
    }

    @Transactional
    public void deleteCategory(Long id){
        InventoryCategory c=categories.findById(id).orElseThrow(()->new IllegalArgumentException("Category not found"));
        if(components.findAll().stream().anyMatch(x->x.getCategory()!=null && x.getCategory().getId().equals(id)))
            throw new IllegalArgumentException("Cannot delete a category that still has components");
        categories.delete(c);
    }

    @Transactional(readOnly = true)
    public List<Component> components(){return components.findAllByOrderByNameAsc();}

    @Transactional
    public Component createComponent(Map<String,Object>b){Component c=new Component();apply(c,b,true); Component saved=components.save(c); return saved;}

    @Transactional
    public Component updateComponent(Long id,Map<String,Object>b){
        Component c=component(id); apply(c,b,false); return components.save(c);
    }

    @Transactional
    public void deleteComponent(Long id){
        Component c=component(id);
        if(transactions.findAllByOrderByTransactionDateDesc().stream().anyMatch(t->t.getComponent()!=null && t.getComponent().getId().equals(id)))
            throw new IllegalArgumentException("Cannot delete a component with transaction history. Archive it instead.");
        components.delete(c);
    }

    private void apply(Component c,Map<String,Object>b,boolean creating){
        c.setName(req(str(b.get("name")),"Name"));
        String code=req(str(b.get("componentCode")),"Component code");
        if((creating && components.existsByComponentCode(code)) || (!creating && components.existsByComponentCodeAndIdNot(code,c.getId())))
            throw new IllegalArgumentException("Component code already exists");
        c.setComponentCode(code);
        Long cat=number(b.get("categoryId"));
        c.setCategory(categories.findById(cat).orElseThrow(()->new IllegalArgumentException("Category not found")));
        c.setManufacturer(str(b.get("manufacturer"))); c.setModelNumber(str(b.get("modelNumber")));
        c.setDescription(str(b.get("description")));
        String u=str(b.get("unit")); c.setUnit(u==null||u.isBlank()?"pcs":u.trim());
        c.setMinimumQuantity(nonNegative(number(b.get("minimumQuantity")),"Minimum quantity"));
        if(creating) c.setCurrentQuantity(nonNegative(number(b.getOrDefault("currentQuantity",0)),"Current quantity"));
        c.setStorageLocation(str(b.get("storageLocation")));
    }

    @Transactional
    public StockTransaction stock(Long id,Map<String,Object>b,String user){
        Component c=components.findWithLockById(id).orElseThrow(()->new IllegalArgumentException("Component not found"));
        String type=req(str(b.get("type")),"Type").toUpperCase();
        TransactionType t; try{t=TransactionType.valueOf(type);}catch(Exception e){throw new IllegalArgumentException("Type must be IN or OUT");}
        int q=nonNegative(number(b.get("quantity")),"Quantity");
        if(q<=0) throw new IllegalArgumentException("Quantity must be greater than zero");
        if(t==TransactionType.OUT&&c.getCurrentQuantity()<q) throw new IllegalArgumentException("Insufficient stock. Available: "+c.getCurrentQuantity());
        c.setCurrentQuantity(c.getCurrentQuantity()+(t==TransactionType.IN?q:-q)); components.save(c);
        StockTransaction x=new StockTransaction(); x.setComponent(c); x.setTransactionType(t); x.setQuantity(q);
        x.setPurpose(str(b.get("purpose"))); x.setCreatedBy(user);
        StockTransaction saved=transactions.save(x);
        log("STOCK_"+type, type+" "+q+" "+c.getUnit()+" of "+c.getName(),user);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<StockTransaction> transactions(){return transactions.findAllByOrderByTransactionDateDesc();}

    @Transactional(readOnly = true)
    public Map<String,Object> dashboard(){
        List<Component> all=components();
        long low=all.stream().filter(c->(c.getCurrentQuantity()==null?0:c.getCurrentQuantity())<=(c.getMinimumQuantity()==null?0:c.getMinimumQuantity())).count();
        int stock=all.stream().mapToInt(c->c.getCurrentQuantity()==null?0:c.getCurrentQuantity()).sum();
        long pending=transactions().stream().filter(t->t.getTransactionType()==TransactionType.OUT).count();
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("totalComponents",all.size()); m.put("totalStock",stock); m.put("lowStockItems",low);
        m.put("outTransactions",pending);
        m.put("recentTransactions",transactions.findTop10ByOrderByTransactionDateDesc());
        m.put("lowStockComponents",all.stream().filter(c->(c.getCurrentQuantity()==null?0:c.getCurrentQuantity())<=(c.getMinimumQuantity()==null?0:c.getMinimumQuantity())).toList());
        return m;
    }

    @Transactional(readOnly = true)
    public Map<String,Object> analytics(){
        List<Component> all=components();
        Map<String,Integer> categoryStock=new LinkedHashMap<>();
        for(Component c:all){
            String catName=c.getCategory()==null?"Uncategorized":c.getCategory().getName();
            int qty=c.getCurrentQuantity()==null?0:c.getCurrentQuantity();
            categoryStock.merge(catName, qty, Integer::sum);
        }

        LocalDate now=settings.today();
        List<Map<String,Object>> monthly=new ArrayList<>();
        for(int i=5;i>=0;i--){
            YearMonth ym=YearMonth.from(now.minusMonths(i));
            int in=0,out=0;
            for(StockTransaction t:transactions()){
                if(t.getTransactionDate()!=null && YearMonth.from(t.getTransactionDate()).equals(ym)){
                    if(t.getTransactionType()==TransactionType.IN) in+=t.getQuantity()==null?0:t.getQuantity(); else out+=t.getQuantity()==null?0:t.getQuantity();
                }
            }
            monthly.add(Map.of("month",ym.toString(),"in",in,"out",out));
        }

        Map<String,Integer> usage=transactions().stream().filter(t->t.getTransactionType()==TransactionType.OUT)
            .collect(Collectors.groupingBy(t->t.getComponent()==null?"Unknown":t.getComponent().getName(),Collectors.summingInt(t->t.getQuantity()==null?0:t.getQuantity())));
        List<Map<String,Object>> top=usage.entrySet().stream().sorted(Map.Entry.<String,Integer>comparingByValue().reversed()).limit(5)
            .map(e->Map.<String,Object>of("name",e.getKey(),"quantity",e.getValue())).toList();

        return Map.of("categoryStock",categoryStock,"monthlyUsage",monthly,"topUsed",top);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> auditLogs(){return audit.findInventoryAuditLogs();}

    private void log(String action,String details,String actor){
        AuditLog l=new AuditLog(); l.setActor(actor); l.setAction(action); l.setDetails(details); audit.save(l);
    }
    private Component component(Long id){return components.findById(id).orElseThrow(()->new IllegalArgumentException("Component not found"));}
    private String req(String v,String n){if(v==null||v.isBlank())throw new IllegalArgumentException(n+" is required");return v.trim();}
    private String str(Object v){return v==null?null:String.valueOf(v);}
    private Long number(Object v){try{return Long.valueOf(String.valueOf(v));}catch(Exception e){throw new IllegalArgumentException("Invalid number");}}
    private int nonNegative(Long v,String n){if(v==null||v<0||v>Integer.MAX_VALUE)throw new IllegalArgumentException(n+" must be zero or greater");return v.intValue();}
}
