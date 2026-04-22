import Head from "next/head";
import Fuse from "fuse.js";
import { scholarshipConfig } from "../scholarshipConfig";
import Dropdown from "../components/dropdown";
import { debounce } from "lodash";
import { trackEvent } from "../lib/analytics";

const fuseOptions = {
  isCaseSensitive: false,
  includeScore: false,
  shouldSort: true,
  includeMatches: false,
  findAllMatches: false,
  minMatchCharLength: 1,
  location: 0,
  threshold: 0.3,
  distance: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  ignoreFieldNorm: false,
  fieldNormWeight: 1,
  keys: ["Scholarship Name"],
};

const ScholarshipFinder = () => {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState([]);
  const [fullData, setFullData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryObject, setQueryObject] = useState({});
  const [expandedRows, setExpandedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [fuseInstance, setFuseInstance] = useState(new Fuse([], fuseOptions));

  useEffect(() => {
    if (fullData && fullData.length > 0) {
      setFuseInstance(new Fuse(fullData, fuseOptions));
    } else {
      setFuseInstance(new Fuse([], fuseOptions));
    }
  }, [fullData]);

  const fetchData = useCallback(async (query) => {
    if (Object.keys(query).length === 0) {
      setIsLoading(false);
      setFullData([]);
      setFilteredData([]);
      setError("Please select filters to find scholarships.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearchTerm("");
    
    // Explicitly track telemetry for scholarship searches
    trackEvent("search_scholarship", {
      grade: query.grade,
      stream: query.stream,
      gender: query.gender,
      state: query.state
    });

    try {
      const params = new URLSearchParams(Object.entries(query));
      const queryString = params.toString();
      const response = await fetch(`/api/scholarship-data?${queryString}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message:
            "No Scholarships found or an error occurred. Try adjusting your search criteria.",
        }));
        setError(
          response.status === 429
            ? "Rate limit exceeded. Please try again later."
            : errorData.message ||
                "No Scholarships found. Try adjusting your search criteria."
        );
        setFullData([]);
        setFilteredData([]);
      } else {
        const data = await response.json();
        setFullData(data);
        setFilteredData(data);
        if (data.length === 0) {
          setError("No scholarships found matching your criteria.");
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err.message || "Failed to fetch scholarships. Please try again."
      );
      setFullData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (router.isReady) {
      const initialQuery = { ...router.query };
      setQueryObject(initialQuery);
      fetchData(initialQuery);
    }
  }, [router.isReady, router.query, fetchData]);

  const debouncedFilterChange = useCallback(
    debounce((newQueryObject) => {
      const params = new URLSearchParams(Object.entries(newQueryObject));
      const queryString = params.toString();
      router.push(`/scholarships_result?${queryString}`, undefined, {
        shallow: true,
      });
      fetchData(newQueryObject);
    }, 500),
    [fetchData, router]
  );

  const handleQueryObjectChange = (key) => (selectedOption) => {
    const newQueryObject = {
      ...queryObject,
      [key]: selectedOption.value,
    };
    setQueryObject(newQueryObject);
    debouncedFilterChange(newQueryObject);
  };

  const handleSearchChange = (e) => {
    const currentSearchTerm = e.target.value;
    setSearchTerm(currentSearchTerm);

    if (currentSearchTerm.trim() === "") {
      setFilteredData(fullData);
      setError(null);
      return;
    }

    if (fullData.length > 0 && fuseInstance) {
      const result = fuseInstance.search(currentSearchTerm.trim());
      if (result.length === 0) {
        setFilteredData([]);
        setError(
          "No scholarships match your search term within the current results."
        );
      } else {
        setFilteredData(result.map((r) => r.item));
        setError(null);
      }
    } else if (fullData.length === 0) {
      setFilteredData([]);
      setError("No data to search. Apply filters to load scholarships first.");
    }
  };

  const toggleRowExpansion = (index) => {
    const updatedExpandedRows = [...expandedRows];
    updatedExpandedRows[index] = !updatedExpandedRows[index];
    setExpandedRows(updatedExpandedRows);
  };

  const renderQueryDetails = () => {
    return (
      <div className="flex flex-col justify-center items-start sm:items-center mb-4 gap-2">
        {scholarshipConfig.fields.map((field) => (
          <div
            key={field.name}
            className="flex items-center justify-center gap-2"
          >
            <label className="font-semibold text-sm md:text-base">
              {field.label}
            </label>
            <Dropdown
              className="text-sm md:text-base"
              options={field.options.map((option) =>
                typeof option === "string"
                  ? { value: option, label: option }
                  : option
              )}
              selectedValue={queryObject[field.name]}
              onChange={handleQueryObjectChange(field.name)}
            />
          </div>
        ))}
      </div>
    );
  };

const ScholarshipsResultPage = () => {
  return (
    <>
      <Head>
        <title>Scholarships Reference - Home</title>
      </Head>
      <ScholarshipReferenceBrowser />
    </>
  );
};

export default ScholarshipsResultPage;
