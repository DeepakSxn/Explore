"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/firebase"
import { Check, Building } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface Company {
  id: string
  name: string
}

interface CompanyFilterAdminProps {
  onFilterChange: (companyName: string | null) => void
  selectedCompany: string | null
}

export function CompanyFilterAdmin({ onFilterChange, selectedCompany }: CompanyFilterAdminProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        
        // Query for users with unique company names
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        
        if (!usersSnapshot.empty) {
          // Group companies by normalized name (case-insensitive)
          const companyMap = new Map<string, { name: string; originalNames: string[] }>();
          
          usersSnapshot.docs.forEach(doc => {
            const companyName = doc.data().companyName;
            if (companyName && typeof companyName === 'string') {
              const normalizedName = companyName.toLowerCase().trim();
              
              if (companyMap.has(normalizedName)) {
                // Company already exists, add original name if different
                const existing = companyMap.get(normalizedName)!;
                if (!existing.originalNames.includes(companyName)) {
                  existing.originalNames.push(companyName);
                }
              } else {
                // New company, initialize
                companyMap.set(normalizedName, {
                  name: companyName,
                  originalNames: [companyName]
                });
              }
            }
          });
          
          // Convert to companies list, choosing the best display name
          const companiesList = Array.from(companyMap.values()).map(company => {
            let displayName = company.name;
            
            // If we have multiple variations, choose the most appropriate one
            if (company.originalNames.length > 1) {
              // Prefer all caps (like EOXS)
              const allCaps = company.originalNames.find(name => name === name.toUpperCase());
              if (allCaps) {
                displayName = allCaps;
              } else {
                // Prefer title case (like Eoxs)
                const titleCase = company.originalNames.find(name => 
                  name.charAt(0) === name.charAt(0).toUpperCase() && 
                  name.slice(1) === name.slice(1).toLowerCase()
                );
                if (titleCase) {
                  displayName = titleCase;
                }
              }
            }
            
            return {
              id: displayName.toLowerCase().replace(/\s+/g, '_'),
              name: displayName
            };
          });
          
          // Sort alphabetically
          companiesList.sort((a, b) => a.name.localeCompare(b.name));



          setCompanies([
            { id: "all", name: "All Companies" },
            ...companiesList
          ]);
        } else {
          // Default if no companies exist
          setCompanies([
            { id: "all", name: "All Companies" },
            { id: "eoxs", name: "EOXS" }
          ]);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
        // Set default companies on error
        setCompanies([
          { id: "all", name: "All Companies" },
          { id: "eoxs", name: "EOXS" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="relative">
      <Select 
        value={selectedCompany || "all"}
        onValueChange={(value) => onFilterChange(value === "all" ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px] focus:ring-primary">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <SelectValue placeholder="All Companies" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 